import ActivityKit
import Capacitor
import Foundation
import UIKit

// Lets the website show the ride on the lock screen and in the Dynamic Island. The site
// sends the card's whole state each time; the app only starts, updates and ends it.
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        guard #available(iOS 16.2, *) else { return }

        // A card left over from a ride the app never ended (it was quit or crashed) is stale
        Task { await Self.endAll(dismissal: .immediate) }

        NotificationCenter.default.addObserver(
            self, selector: #selector(appWillTerminate), name: UIApplication.willTerminateNotification, object: nil)
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return call.resolve() }
        guard let state = Self.state(from: call) else { return call.reject("Missing or invalid state") }

        let attributes = RideActivityAttributes(destinationName: call.getString("destinationName"))
        Task {
            // One ride at a time
            await Self.endAll(dismissal: .immediate)
            do {
                _ = try Activity.request(attributes: attributes, content: ActivityContent(state: state, staleDate: nil))
                call.resolve()
            } catch {
                call.reject("Couldn't start the ride card", nil, error)
            }
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        guard let state = Self.state(from: call) else { return call.reject("Missing or invalid state") }

        Task {
            for activity in Activity<RideActivityAttributes>.activities {
                await activity.update(ActivityContent(state: state, staleDate: nil))
            }
            call.resolve()
        }
    }

    // With a final state (the rider arrived), the card stays on the lock screen for a while
    // so they can see their ride; without one it goes at once
    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        let finalState = Self.state(from: call)

        Task {
            if let finalState {
                for activity in Activity<RideActivityAttributes>.activities {
                    await activity.end(
                        ActivityContent(state: finalState, staleDate: nil),
                        dismissalPolicy: .after(Date().addingTimeInterval(15 * 60)))
                }
            } else {
                await Self.endAll(dismissal: .immediate)
            }
            call.resolve()
        }
    }

    @objc private func appWillTerminate() {
        guard #available(iOS 16.2, *) else { return }

        // The app is about to be gone, so wait briefly for the card to end rather than leave
        // it on the lock screen for hours
        let done = DispatchSemaphore(value: 0)
        Task {
            await Self.endAll(dismissal: .immediate)
            done.signal()
        }
        _ = done.wait(timeout: .now() + 2)
    }

    @available(iOS 16.2, *)
    private static func endAll(dismissal: ActivityUIDismissalPolicy) async {
        for activity in Activity<RideActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: dismissal)
        }
    }

    @available(iOS 16.1, *)
    private static func state(from call: CAPPluginCall) -> RideActivityAttributes.ContentState? {
        guard let object = call.getObject("state"),
              let data = try? JSONSerialization.data(withJSONObject: object)
        else { return nil }
        return try? JSONDecoder().decode(RideActivityAttributes.ContentState.self, from: data)
    }
}
