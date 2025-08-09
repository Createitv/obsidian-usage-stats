import { Command, Notice } from "obsidian";
import { t } from "../i18n/i18n";
import UsageStatsPlugin from "../main";

export class UsageStatsCommandManager {
	private plugin: UsageStatsPlugin;

	constructor(plugin: UsageStatsPlugin) {
		this.plugin = plugin;
	}
}
