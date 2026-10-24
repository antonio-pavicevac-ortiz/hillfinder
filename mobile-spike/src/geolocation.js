import { registerPlugin } from "@capacitor/core";

// The community plugin ships no JS wrapper; this binds to its native implementation
export const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");
