import { jsxRenderer } from 'hono/jsx-renderer'

interface RendererProps {
  children?: any;
  title?: string;
}

const BODY_STYLE = "bg-background text-foreground font-sans antialiased";

export const renderer = jsxRenderer(({ children, title }: RendererProps) => {
    return (
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="theme-color" content="#2563eb" />
                <title>{title || 'AlfredGo '}</title>
                <link rel="manifest" href="/manifest.json" />
                <link rel="stylesheet" href="/css/style.css" />
                <script src="/htmx.min.js" defer></script>
                <script src="/js/main.js" type="module" defer></script>
            </head>
            <body class={BODY_STYLE}>
                {children}
            </body>
        </html>
    )
});
