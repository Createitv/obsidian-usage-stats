import { App, Modal, Notice } from "obsidian";

export class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Create modal header
		const headerEl = contentEl.createEl("div", { cls: "modal-header" });
		headerEl.createEl("h2", { text: "Plugin Modal" });

		// Create modal content
		const contentContainer = contentEl.createEl("div", {
			cls: "modal-content",
		});

		// Add form elements
		const formEl = contentContainer.createEl("form", { cls: "modal-form" });

		// Name field
		const nameField = formEl.createEl("div", { cls: "form-field" });
		const nameLabel = nameField.createEl("label", { text: "Name:" });
		const nameInput = nameField.createEl("input", {
			type: "text",
			placeholder: "Enter your name",
		});
		nameLabel.setAttribute("for", "modal-name");
		nameInput.setAttribute("id", "modal-name");

		// Message field
		const messageField = formEl.createEl("div", { cls: "form-field" });
		const messageLabel = messageField.createEl("label", {
			text: "Message:",
		});
		const messageTextarea = messageField.createEl("textarea", {
			placeholder: "Enter your message",
		});
		messageLabel.setAttribute("for", "modal-message");
		messageTextarea.setAttribute("id", "modal-message");

		// Buttons
		const buttonContainer = contentEl.createEl("div", {
			cls: "modal-buttons",
		});

		const submitBtn = buttonContainer.createEl("button", {
			text: "Submit",
			cls: "mod-cta",
		});
		submitBtn.addEventListener("click", (e) => {
			e.preventDefault();
			this.handleSubmit(nameInput.value, messageTextarea.value);
		});

		const cancelBtn = buttonContainer.createEl("button", {
			text: "Cancel",
		});
		cancelBtn.addEventListener("click", () => {
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private handleSubmit(name: string, message: string) {
		if (!name.trim()) {
			new Notice("Please enter a name!");
			return;
		}

		if (!message.trim()) {
			new Notice("Please enter a message!");
			return;
		}

		new Notice(`Hello ${name}! Your message: ${message}`);
		this.close();
	}
}
