export function deepActiveElement(node: Node): Element | null {
	const root = node.getRootNode();
	let active = root instanceof Document || root instanceof ShadowRoot ? root.activeElement : null;
	while (active?.shadowRoot?.activeElement) {
		active = active.shadowRoot.activeElement;
	}
	return active;
}
