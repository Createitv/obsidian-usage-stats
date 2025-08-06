export interface MyPluginSettings {
	mySetting: string;
	enableView: boolean;
	viewTitle: string;
	viewContent: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
	enableView: true,
	viewTitle: "Plugin View",
	viewContent: "This is the plugin view content.",
};

export interface ViewData {
	id: string;
	title: string;
	content: string;
	timestamp: number;
}

export interface PluginViewState {
	views: ViewData[];
	activeViewId: string | null;
}
