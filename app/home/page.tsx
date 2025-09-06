import React from 'react';
import Head from 'next/head';

const ShowProperties: React.FC = () => {
    return (
        <div>
            <Head>
                <title>Home</title>
            </Head>

            <h1>Home</h1>
       </div>
    );

};

export default ShowProperties;

///The Head component is used to set the page title. 
//However, in the App Router, it's recommended to use the Metadata API instead of the Head component.

//Implicit children prop:
//React.FC automatically includes the children prop in its type definition.
//This means any component typed as React.FC can accept children elements, even if not explicitly defined.

//It specifies that the component should return ReactElement | null.

//const ShowProperties: React.FC = () => {
    // component body
//  };
//This declares ShowProperties as a React functional component.



/*
import React from 'react';
import Head from 'next/head';

// Define the props interface explicitly
interface ShowPropertiesProps {
  children?: React.ReactNode; // Make children optional
}

// Define the component without using React.FC
const ShowProperties = ({ children }: ShowPropertiesProps): JSX.Element => {
    return (
        <div>
            <Head>
                <title>Title here..</title>
            </Head>

            <h1>H1 Title here</h1>
            
            //{ Render children if provided }
            {children}
        </div>
    );
};

export default ShowProperties;
*/