import ActivityKit
import SwiftUI
import WidgetKit

// The ride card on the lock screen and in the Dynamic Island. It mirrors the navigation card
// in the app: the current step, how far it is, and what comes after.

private let brandGreen = Color(red: 0x22 / 255, green: 0xC5 / 255, blue: 0x5E / 255)
private let offRouteAmber = Color(red: 0xFB / 255, green: 0xBF / 255, blue: 0x24 / 255)
private let toStartBlue = Color(red: 0x60 / 255, green: 0xA5 / 255, blue: 0xFA / 255)
private let cardBackground = Color(red: 0x02 / 255, green: 0x06 / 255, blue: 0x17 / 255)

private typealias State = RideActivityAttributes.ContentState

struct RideActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RideActivityAttributes.self) { context in
            LockScreenView(state: context.state, destinationName: context.attributes.destinationName)
                .activityBackgroundTint(cardBackground)
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let state = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    ManeuverIcon(state: state, size: 40)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let badge = badgeText(state) {
                        Text(badge)
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(accent(state))
                            .padding(.trailing, 4)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(headline(state, destinationName: context.attributes.destinationName))
                            .font(.headline)
                            .lineLimit(2)
                        if let detail = detail(state) {
                            Text(detail)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Image(systemName: symbolName(state))
                    .foregroundStyle(accent(state))
            } compactTrailing: {
                if let badge = badgeText(state) {
                    Text(badge)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(accent(state))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            } minimal: {
                Image(systemName: symbolName(state))
                    .foregroundStyle(accent(state))
            }
            .keylineTint(accent(state))
        }
    }
}

private struct LockScreenView: View {
    let state: State
    let destinationName: String?

    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            ManeuverIcon(state: state, size: 48)

            VStack(alignment: .leading, spacing: 3) {
                Text(label(state))
                    .font(.caption2.weight(.semibold))
                    .tracking(1.2)
                    .foregroundStyle(accent(state))
                Text(headline(state, destinationName: destinationName))
                    .font(.headline)
                    .foregroundStyle(.white)
                    .lineLimit(2)
                if let detail = detail(state) {
                    Text(detail)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.7))
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let badge = badgeText(state) {
                Text(badge)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .padding(16)
    }
}

private struct ManeuverIcon: View {
    let state: State
    let size: CGFloat

    var body: some View {
        Image(systemName: symbolName(state))
            .font(.system(size: size * 0.45, weight: .bold))
            .foregroundStyle(cardBackground)
            .frame(width: size, height: size)
            .background(accent(state), in: Circle())
    }
}

private func accent(_ state: State) -> Color {
    switch state.phase {
    case .toStart: return toStartBlue
    case .offRoute: return offRouteAmber
    case .riding, .arrived: return brandGreen
    }
}

private func label(_ state: State) -> String {
    switch state.phase {
    case .toStart: return "TO THE START"
    case .riding: return "NAVIGATION"
    case .offRoute: return "OFF ROUTE"
    case .arrived: return "ARRIVED"
    }
}

private func headline(_ state: State, destinationName: String?) -> String {
    switch state.phase {
    case .toStart: return "Head to the start of your route"
    case .riding, .offRoute: return state.instruction
    case .arrived: return destinationName.map { "You’ve arrived at \($0)" } ?? "You’ve arrived"
    }
}

private func detail(_ state: State) -> String? {
    switch state.phase {
    case .toStart: return "Then: \(state.instruction)"
    case .riding: return state.nextInstruction.map { "Then: \($0)" } ?? "Final step"
    case .offRoute: return "Open Hillfinder to get back on route"
    case .arrived:
        let parts = [state.rideTime, state.rideDistance].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

// The distance means nothing once the rider has left the route
private func badgeText(_ state: State) -> String? {
    switch state.phase {
    case .toStart, .riding: return state.distance
    case .offRoute, .arrived: return nil
    }
}

private func symbolName(_ state: State) -> String {
    switch state.phase {
    case .toStart: return "location.north.fill"
    case .offRoute: return "exclamationmark"
    case .arrived: return "flag.checkered"
    case .riding: break
    }

    switch state.maneuver {
    case "left": return "arrow.turn.up.left"
    case "slightLeft": return "arrow.up.left"
    case "right": return "arrow.turn.up.right"
    case "slightRight": return "arrow.up.right"
    case "uturn": return "arrow.uturn.down"
    case "arrive": return "flag.checkered"
    default: return "arrow.up"
    }
}
