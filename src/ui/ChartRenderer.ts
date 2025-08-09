/**
 * Chart rendering functionality for usage statistics
 */

import {
	ChartData,
	ChartType,
	CategoryStats,
	FileStats,
	TagStats,
	DailyStats,
} from "../core/types";
import { t } from "../i18n/i18n";

export interface ChartOptions {
	width?: number;
	height?: number;
	colors?: string[];
	showLegend?: boolean;
	showLabels?: boolean;
	responsive?: boolean;
}

export class ChartRenderer {
	private static readonly DEFAULT_COLORS = [
		"#4CAF50",
		"#2196F3",
		"#FF9800",
		"#9C27B0",
		"#F44336",
		"#00BCD4",
		"#FFEB3B",
		"#795548",
		"#607D8B",
		"#E91E63",
		"#3F51B5",
		"#CDDC39",
		"#FF5722",
		"#009688",
		"#FFC107",
	];

	private container: HTMLElement;
	private options: ChartOptions;

	constructor(container: HTMLElement, options: ChartOptions = {}) {
		this.container = container;
		this.options = {
			width: 400,
			height: 300,
			colors: ChartRenderer.DEFAULT_COLORS,
			showLegend: true,
			showLabels: true,
			responsive: true,
			...options,
		};
	}

	// Main rendering method
	public renderChart(type: ChartType, data: ChartData): void {
		this.container.innerHTML = "";

		switch (type) {
			case "pie":
				this.renderPieChart(data);
				break;
			case "doughnut":
				this.renderDoughnutChart(data);
				break;
			case "bar":
				this.renderBarChart(data);
				break;
			case "line":
				this.renderLineChart(data);
				break;
			default:
				this.renderPieChart(data);
		}
	}

	// Convenience methods for different data types
	public renderCategoryChart(
		type: ChartType,
		categories: CategoryStats[]
	): void {
		const data = this.convertCategoriesToChartData(categories);
		this.renderChart(type, data);
	}

	public renderFileChart(type: ChartType, files: FileStats[]): void {
		const data = this.convertFilesToChartData(files);
		this.renderChart(type, data);
	}

	public renderTagChart(type: ChartType, tags: TagStats[]): void {
		const data = this.convertTagsToChartData(tags);
		this.renderChart(type, data);
	}

	public renderDailyChart(dailyStats: DailyStats[]): void {
		const data = this.convertDailyStatsToChartData(dailyStats);
		this.renderLineChart(data);
	}

	// Chart rendering implementations
	private renderPieChart(data: ChartData): void {
		const svg = this.createSVG();
		const centerX = (this.options.width || 400) / 2;
		const centerY = (this.options.height || 300) / 2;
		const radius = Math.min(centerX, centerY) - 40;

		if (data.datasets.length === 0 || data.datasets[0].data.length === 0) {
			this.renderNoDataMessage();
			return;
		}

		const dataset = data.datasets[0];
		const total = dataset.data.reduce((sum, value) => sum + value, 0);

		if (total === 0) {
			this.renderNoDataMessage();
			return;
		}

		let currentAngle = -Math.PI / 2; // Start from top

		dataset.data.forEach((value, index) => {
			const angle = (value / total) * 2 * Math.PI;
			const x1 = centerX + radius * Math.cos(currentAngle);
			const y1 = centerY + radius * Math.sin(currentAngle);
			const x2 = centerX + radius * Math.cos(currentAngle + angle);
			const y2 = centerY + radius * Math.sin(currentAngle + angle);

			const largeArcFlag = angle > Math.PI ? 1 : 0;

			const pathData = [
				`M ${centerX} ${centerY}`,
				`L ${x1} ${y1}`,
				`A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
				"Z",
			].join(" ");

			const slice = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"path"
			);
			slice.setAttribute("d", pathData);
			slice.setAttribute("fill", this.getColor(index));
			slice.setAttribute("stroke", "var(--background-primary)");
			slice.setAttribute("stroke-width", "2");
			slice.classList.add("chart-slice");

			// Add hover effects
			slice.addEventListener("mouseenter", () => {
				slice.setAttribute("opacity", "0.8");
				this.showTooltip(data.labels[index], value, total);
			});

			slice.addEventListener("mouseleave", () => {
				slice.setAttribute("opacity", "1");
				this.hideTooltip();
			});

			svg.appendChild(slice);

			currentAngle += angle;
		});

		this.container.appendChild(svg);

		if (this.options.showLegend) {
			this.renderLegend(data);
		}
	}

	private renderDoughnutChart(data: ChartData): void {
		const svg = this.createSVG();
		const centerX = (this.options.width || 400) / 2;
		const centerY = (this.options.height || 300) / 2;
		const outerRadius = Math.min(centerX, centerY) - 40;
		const innerRadius = outerRadius * 0.6; // 60% inner radius

		if (data.datasets.length === 0 || data.datasets[0].data.length === 0) {
			this.renderNoDataMessage();
			return;
		}

		const dataset = data.datasets[0];
		const total = dataset.data.reduce((sum, value) => sum + value, 0);

		if (total === 0) {
			this.renderNoDataMessage();
			return;
		}

		let currentAngle = -Math.PI / 2;

		dataset.data.forEach((value, index) => {
			const angle = (value / total) * 2 * Math.PI;

			const x1Outer = centerX + outerRadius * Math.cos(currentAngle);
			const y1Outer = centerY + outerRadius * Math.sin(currentAngle);
			const x2Outer =
				centerX + outerRadius * Math.cos(currentAngle + angle);
			const y2Outer =
				centerY + outerRadius * Math.sin(currentAngle + angle);

			const x1Inner = centerX + innerRadius * Math.cos(currentAngle);
			const y1Inner = centerY + innerRadius * Math.sin(currentAngle);
			const x2Inner =
				centerX + innerRadius * Math.cos(currentAngle + angle);
			const y2Inner =
				centerY + innerRadius * Math.sin(currentAngle + angle);

			const largeArcFlag = angle > Math.PI ? 1 : 0;

			const pathData = [
				`M ${x1Inner} ${y1Inner}`,
				`L ${x1Outer} ${y1Outer}`,
				`A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
				`L ${x2Inner} ${y2Inner}`,
				`A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}`,
				"Z",
			].join(" ");

			const slice = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"path"
			);
			slice.setAttribute("d", pathData);
			slice.setAttribute("fill", this.getColor(index));
			slice.setAttribute("stroke", "var(--background-primary)");
			slice.setAttribute("stroke-width", "2");
			slice.classList.add("chart-slice");

			// Add hover effects
			slice.addEventListener("mouseenter", () => {
				slice.setAttribute("opacity", "0.8");
				this.showTooltip(data.labels[index], value, total);
			});

			slice.addEventListener("mouseleave", () => {
				slice.setAttribute("opacity", "1");
				this.hideTooltip();
			});

			svg.appendChild(slice);
			currentAngle += angle;
		});

		this.container.appendChild(svg);

		if (this.options.showLegend) {
			this.renderLegend(data);
		}
	}

	private renderBarChart(data: ChartData): void {
		const svg = this.createSVG();
		const margin = { top: 20, right: 20, bottom: 40, left: 60 };
		const width = (this.options.width || 400) - margin.left - margin.right;
		const height =
			(this.options.height || 300) - margin.top - margin.bottom;

		if (data.datasets.length === 0 || data.datasets[0].data.length === 0) {
			this.renderNoDataMessage();
			return;
		}

		const dataset = data.datasets[0];
		const maxValue = Math.max(...dataset.data);

		if (maxValue === 0) {
			this.renderNoDataMessage();
			return;
		}

		const barWidth = (width / data.labels.length) * 0.8;
		const barSpacing = (width / data.labels.length) * 0.2;

		// Create chart group
		const chartGroup = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"g"
		);
		chartGroup.setAttribute(
			"transform",
			`translate(${margin.left}, ${margin.top})`
		);

		// Draw bars
		dataset.data.forEach((value, index) => {
			const barHeight = (value / maxValue) * height;
			const x = index * (barWidth + barSpacing);
			const y = height - barHeight;

			const bar = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"rect"
			);
			bar.setAttribute("x", x.toString());
			bar.setAttribute("y", y.toString());
			bar.setAttribute("width", barWidth.toString());
			bar.setAttribute("height", barHeight.toString());
			bar.setAttribute("fill", this.getColor(index));
			bar.setAttribute("stroke", "var(--background-primary)");
			bar.classList.add("chart-bar");

			// Add hover effects
			bar.addEventListener("mouseenter", () => {
				bar.setAttribute("opacity", "0.8");
				this.showTooltip(data.labels[index], value, maxValue);
			});

			bar.addEventListener("mouseleave", () => {
				bar.setAttribute("opacity", "1");
				this.hideTooltip();
			});

			chartGroup.appendChild(bar);

			// Add label
			if (this.options.showLabels) {
				const label = document.createElementNS(
					"http://www.w3.org/2000/svg",
					"text"
				);
				label.setAttribute("x", (x + barWidth / 2).toString());
				label.setAttribute("y", (height + 15).toString());
				label.setAttribute("text-anchor", "middle");
				label.setAttribute("font-size", "10");
				label.setAttribute("fill", "var(--text-muted)");
				label.textContent = this.truncateLabel(data.labels[index], 10);
				chartGroup.appendChild(label);
			}
		});

		// Draw Y-axis
		const yAxis = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"line"
		);
		yAxis.setAttribute("x1", margin.left.toString());
		yAxis.setAttribute("y1", margin.top.toString());
		yAxis.setAttribute("x2", margin.left.toString());
		yAxis.setAttribute("y2", (margin.top + height).toString());
		yAxis.setAttribute("stroke", "var(--text-muted)");
		yAxis.setAttribute("stroke-width", "1");
		svg.appendChild(yAxis);

		// Draw X-axis
		const xAxis = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"line"
		);
		xAxis.setAttribute("x1", margin.left.toString());
		xAxis.setAttribute("y1", (margin.top + height).toString());
		xAxis.setAttribute("x2", (margin.left + width).toString());
		xAxis.setAttribute("y2", (margin.top + height).toString());
		xAxis.setAttribute("stroke", "var(--text-muted)");
		xAxis.setAttribute("stroke-width", "1");
		svg.appendChild(xAxis);

		svg.appendChild(chartGroup);
		this.container.appendChild(svg);
	}

	private renderLineChart(data: ChartData): void {
		const svg = this.createSVG();
		const margin = { top: 20, right: 20, bottom: 40, left: 60 };
		const width = (this.options.width || 400) - margin.left - margin.right;
		const height =
			(this.options.height || 300) - margin.top - margin.bottom;

		if (data.datasets.length === 0 || data.datasets[0].data.length === 0) {
			this.renderNoDataMessage();
			return;
		}

		const dataset = data.datasets[0];
		const maxValue = Math.max(...dataset.data);

		if (maxValue === 0) {
			this.renderNoDataMessage();
			return;
		}

		const stepX = width / (data.labels.length - 1);

		// Create chart group
		const chartGroup = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"g"
		);
		chartGroup.setAttribute(
			"transform",
			`translate(${margin.left}, ${margin.top})`
		);

		// Create path for line
		const pathData = dataset.data
			.map((value, index) => {
				const x = index * stepX;
				const y = height - (value / maxValue) * height;
				return `${index === 0 ? "M" : "L"} ${x} ${y}`;
			})
			.join(" ");

		const line = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"path"
		);
		line.setAttribute("d", pathData);
		line.setAttribute("fill", "none");
		line.setAttribute("stroke", this.getColor(0));
		line.setAttribute("stroke-width", "2");
		line.classList.add("chart-line");

		chartGroup.appendChild(line);

		// Add data points
		dataset.data.forEach((value, index) => {
			const x = index * stepX;
			const y = height - (value / maxValue) * height;

			const point = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"circle"
			);
			point.setAttribute("cx", x.toString());
			point.setAttribute("cy", y.toString());
			point.setAttribute("r", "4");
			point.setAttribute("fill", this.getColor(0));
			point.setAttribute("stroke", "var(--background-primary)");
			point.setAttribute("stroke-width", "2");
			point.classList.add("chart-point");

			// Add hover effects
			point.addEventListener("mouseenter", () => {
				point.setAttribute("r", "6");
				this.showTooltip(data.labels[index], value, maxValue);
			});

			point.addEventListener("mouseleave", () => {
				point.setAttribute("r", "4");
				this.hideTooltip();
			});

			chartGroup.appendChild(point);
		});

		// Draw axes
		const yAxis = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"line"
		);
		yAxis.setAttribute("x1", margin.left.toString());
		yAxis.setAttribute("y1", margin.top.toString());
		yAxis.setAttribute("x2", margin.left.toString());
		yAxis.setAttribute("y2", (margin.top + height).toString());
		yAxis.setAttribute("stroke", "var(--text-muted)");
		yAxis.setAttribute("stroke-width", "1");
		svg.appendChild(yAxis);

		const xAxis = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"line"
		);
		xAxis.setAttribute("x1", margin.left.toString());
		xAxis.setAttribute("y1", (margin.top + height).toString());
		xAxis.setAttribute("x2", (margin.left + width).toString());
		xAxis.setAttribute("y2", (margin.top + height).toString());
		xAxis.setAttribute("stroke", "var(--text-muted)");
		xAxis.setAttribute("stroke-width", "1");
		svg.appendChild(xAxis);

		svg.appendChild(chartGroup);
		this.container.appendChild(svg);
	}

	// Data conversion methods
	private convertCategoriesToChartData(
		categories: CategoryStats[]
	): ChartData {
		return {
			labels: categories.map((cat) => cat.category),
			datasets: [
				{
					label: t("chart.byCategory"),
					data: categories.map((cat) => cat.totalTime),
					backgroundColor: categories.map((_, index) =>
						this.getColor(index)
					),
				},
			],
		};
	}

	private convertFilesToChartData(files: FileStats[]): ChartData {
		// Limit to top 10 files for readability
		const topFiles = files.slice(0, 10);
		return {
			labels: topFiles.map((file) => file.fileName),
			datasets: [
				{
					label: t("chart.byFile"),
					data: topFiles.map((file) => file.totalTime),
					backgroundColor: topFiles.map((_, index) =>
						this.getColor(index)
					),
				},
			],
		};
	}

	private convertTagsToChartData(tags: TagStats[]): ChartData {
		// Limit to top 10 tags for readability
		const topTags = tags.slice(0, 10);
		return {
			labels: topTags.map((tag) => tag.tag),
			datasets: [
				{
					label: t("chart.byTag"),
					data: topTags.map((tag) => tag.totalTime),
					backgroundColor: topTags.map((_, index) =>
						this.getColor(index)
					),
				},
			],
		};
	}

	private convertDailyStatsToChartData(dailyStats: DailyStats[]): ChartData {
		return {
			labels: dailyStats.map((stat) => stat.date),
			datasets: [
				{
					label: t("chart.daily"),
					data: dailyStats.map((stat) => stat.totalTime),
					backgroundColor: [this.getColor(0)],
				},
			],
		};
	}

	// Helper methods
	private createSVG(): SVGSVGElement {
		const svg = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"svg"
		);
		svg.setAttribute("width", (this.options.width || 400).toString());
		svg.setAttribute("height", (this.options.height || 300).toString());
		svg.setAttribute(
			"viewBox",
			`0 0 ${this.options.width || 400} ${this.options.height || 300}`
		);
		svg.classList.add("usage-stats-chart");
		return svg as SVGSVGElement;
	}

	private getColor(index: number): string {
		const colors = this.options.colors || ChartRenderer.DEFAULT_COLORS;
		return colors[index % colors.length];
	}

	private renderLegend(data: ChartData): void {
		const legend = this.container.createEl("div", { cls: "chart-legend" });

		data.labels.forEach((label, index) => {
			const item = legend.createEl("div", { cls: "legend-item" });

			const colorBox = item.createEl("span", { cls: "legend-color" });
			colorBox.style.backgroundColor = this.getColor(index);

			const labelText = item.createEl("span", {
				cls: "legend-label",
				text: label,
			});
		});
	}

	private renderNoDataMessage(): void {
		const message = this.container.createEl("div", {
			cls: "chart-no-data",
			text: t("view.noData"),
		});
		message.style.textAlign = "center";
		message.style.padding = "50px";
		message.style.color = "var(--text-muted)";
	}

	private truncateLabel(label: string, maxLength: number): string {
		if (label.length <= maxLength) {
			return label;
		}
		return label.substring(0, maxLength - 3) + "...";
	}

	private showTooltip(label: string, value: number, total: number): void {
		// Remove existing tooltip
		this.hideTooltip();

		const tooltip = document.createElement("div");
		tooltip.className = "chart-tooltip";
		tooltip.style.position = "absolute";
		tooltip.style.background = "var(--background-secondary)";
		tooltip.style.border = "1px solid var(--background-modifier-border)";
		tooltip.style.borderRadius = "4px";
		tooltip.style.padding = "8px";
		tooltip.style.fontSize = "12px";
		tooltip.style.pointerEvents = "none";
		tooltip.style.zIndex = "1000";

		const percentage = ((value / total) * 100).toFixed(1);
		const formattedTime = this.formatDuration(value);

		tooltip.innerHTML = `
			<div><strong>${label}</strong></div>
			<div>${formattedTime} (${percentage}%)</div>
		`;

		document.body.appendChild(tooltip);

		// Position tooltip
		document.addEventListener("mousemove", this.positionTooltip);
	}

	private hideTooltip(): void {
		const tooltip = document.querySelector(".chart-tooltip");
		if (tooltip) {
			tooltip.remove();
			document.removeEventListener("mousemove", this.positionTooltip);
		}
	}

	private positionTooltip = (e: MouseEvent): void => {
		const tooltip = document.querySelector(".chart-tooltip") as HTMLElement;
		if (tooltip) {
			tooltip.style.left = e.clientX + 10 + "px";
			tooltip.style.top = e.clientY + 10 + "px";
		}
	};

	private formatDuration(milliseconds: number): string {
		const seconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return t("time.hoursMinutes", {
				hours: hours.toString(),
				minutes: (minutes % 60).toString(),
			});
		} else if (minutes > 0) {
			return t("time.minutesSeconds", {
				minutes: minutes.toString(),
				seconds: (seconds % 60).toString(),
			});
		} else {
			return t("time.seconds", { count: seconds.toString() });
		}
	}

	// Public utility methods
	public updateOptions(newOptions: Partial<ChartOptions>): void {
		this.options = { ...this.options, ...newOptions };
	}

	public clear(): void {
		this.container.innerHTML = "";
	}

	public resize(width: number, height: number): void {
		this.options.width = width;
		this.options.height = height;
	}
}
