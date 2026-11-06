import Capacitor

// Plugins that live in this app rather than in an npm package have to be registered by hand
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiveActivityPlugin())
    }
}
