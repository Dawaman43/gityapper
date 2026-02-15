import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";
import { queryClient, trpc } from "./utils/trpc";

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPendingComponent: () => <Loader />,
	context: { trpc, queryClient },
	Wrap: function WrapComponent({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

if (typeof window !== "undefined") {
	const titleStyle = [
		"font-size: 30px",
		"font-weight: 900",
		"letter-spacing: 3px",
		"color: #ffffff",
		"background: linear-gradient(90deg, #0ea5e9, #22c55e)",
		"padding: 8px 16px",
		"border-radius: 10px",
		"text-shadow: 0 2px 10px rgba(14,165,233,0.35)",
	].join(";");
	const subtitleStyle = [
		"font-size: 14px",
		"font-weight: 700",
		"color: #0f172a",
		"background: #e2e8f0",
		"padding: 6px 10px",
		"border-radius: 8px",
	].join(";");
	const linkStyle = [
		"font-size: 13px",
		"font-weight: 700",
		"color: #0ea5e9",
	].join(";");
	console.log("%cGITYAP", titleStyle);
	console.log("%cWhat are you doing here, bro?", subtitleStyle);
	console.log("%cJoin t.me/dcodeer", linkStyle);
}

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
