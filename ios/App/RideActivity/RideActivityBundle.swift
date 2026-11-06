import SwiftUI
import WidgetKit

// Only the ride card; Hillfinder has no Home Screen widget
@main
struct RideActivityBundle: WidgetBundle {
    var body: some Widget {
        RideActivityLiveActivity()
    }
}
