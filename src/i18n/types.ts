import en from "./locales/en";
import zh from "./locales/zh";

// 定义支持的语言类型
export const SupportedLocales: Record<string, BaseMessage> = {
	en,
	zh,
};

interface IBaseSettingsItem {
	name: string;
	desc: string;
}
type SettingsItem<T = Record<string, never>> = IBaseSettingsItem & T;

// 定义翻译结构类型
export type BaseMessage = Record<string, string>;

// 简化的翻译键类型，允许任何字符串
export type TranslationKeys = string;

// 参数类型定义
export type TranslationParams = Record<string, any> | any[];
