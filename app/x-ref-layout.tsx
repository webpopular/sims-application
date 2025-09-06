import ShowProperties from "./home/page"

export default function RootLayout( {children}: {children: React.ReactNode} ) {

    return(
        <html lang="en">
            <body>
                <header></header>
                    {children}
                <footer>@2025</footer>
            </body>
        </html>

    )  
}

//This syntax allows the RootLayout function to receive a children 'prop' of type React.ReactNode,
//which it can then use within its body to render the child components or elements.

//in <body>{children}</body>
//The curly braces {} in JSX allow you to embed JavaScript expressions.

//children here refers to the children prop that was passed to the RootLayout function. 
//This is where the content of your individual pages will be rendered.


//How it works in Next.js:
//When you navigate between pages in your Next.js app, 
//the content inside {children} will change, but the surrounding HTML structure remains constant.
//This is part of Next.js's layout system, allowing for efficient updates and consistent page structure.

/*
relationship between page.tsx and layout.tsx in Next.js 13+ with the App Router is crucial. Let's break it down:
Execution Order:
layout.tsx is executed first.
page.tsx content is then rendered inside the layout.
Hierarchy:
layout.tsx is the parent component.
page.tsx content becomes the child of the layout.
Main Caller:
Next.js itself is the main orchestrator.
It first looks for and executes layout.tsx.
Then it finds the appropriate page.tsx and renders its content within the layout.
Relationship:
layout.tsx provides the overall structure for all pages.
page.tsx provides the specific content for a particular route.
The content of page.tsx is passed as the children prop to layout.tsx.
How it works:
When a request comes in for a specific route:
Next.js finds the appropriate page.tsx.
It then looks for the nearest parent layout.tsx.
The layout is rendered first, with the page content injected as its children.
Example flow:
User requests "/about"
Next.js finds app/about/page.tsx
It then finds app/layout.tsx
layout.tsx is rendered, with about/page.tsx content as its children
Multiple layouts:
You can have nested layouts (e.g., app/dashboard/layout.tsx).
The most specific layout wraps the page, then its parent layout, and so on.
Reusability:
layout.tsx is reused across multiple pages.
Each page.tsx is specific to its route.
Data fetching:
Both can fetch their own data independently.
Layout data fetching occurs before page data fetching.
In summary, layout.tsx acts as a container that wraps around the content of page.tsx. Next.js manages this process, ensuring that the layout is rendered first and then injects the specific page content into it. This structure allows for consistent layouts across your application while enabling page-specific content.
*/


//Strict Naming:
//By default, Next.js requires you to use page.tsx for the main component of each route. This is not flexible out of the box.