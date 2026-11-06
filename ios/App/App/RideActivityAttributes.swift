import ActivityKit
import Foundation

// What the lock-screen ride card shows. Compiled into both the app, which starts and updates
// the card, and the RideActivity widget extension, which draws it; the two must agree.
@available(iOS 16.1, *)
struct RideActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        enum Phase: String, Codable {
            case toStart
            case riding
            case offRoute
            case arrived
        }

        var phase: Phase
        var instruction: String
        // Already formatted by the website, e.g. "350 ft"
        var distance: String?
        var nextInstruction: String?
        // left, slightLeft, right, slightRight, uturn, straight or arrive
        var maneuver: String?
        // Shown once the rider arrives
        var rideTime: String?
        var rideDistance: String?
    }

    var destinationName: String?
}
