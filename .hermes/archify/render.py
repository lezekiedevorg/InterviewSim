import asyncio
import sys
from pathlib import Path
from playwright.async_api import async_playwright

async def render(html_path: str, png_path: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        context = await browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=2,
        )
        page = await context.new_page()
        url = f"file://{html_path}"
        await page.goto(url, wait_until="networkidle")
        # Hide the archify toolbar / viewer chrome via CSS injection
        await page.add_style_tag(content="""
            .archify-viewer-toolbar,
            .archify-toolbar,
            [class*="toolbar"],
            [class*="Toolbar"],
            .viewer-toolbar,
            .controls,
            .viewer-controls,
            header[role="banner"],
            .archify-credits,
            [class*="credits"] { display: none !important; }
        """)
        await page.wait_for_timeout(800)
        await page.screenshot(path=png_path, full_page=True, type="png")
        await browser.close()
        print(f"OK -> {png_path}")

if __name__ == "__main__":
    asyncio.run(render(sys.argv[1], sys.argv[2]))