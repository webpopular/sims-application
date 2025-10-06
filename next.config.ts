import type { NextConfig } from "next";

const nextConfig = {
    reactStrictMode: true,
    env: {
        AWS_REGION: process.env.AWS_REGION,
        MY_AWS_REGION: process.env.MY_AWS_REGION,
        COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
        COGNITO_USERNAME: process.env.COGNITO_USERNAME,
        COGNITO_PASSWORD: process.env.COGNITO_PASSWORD,
        APPSYNC_API_URL: process.env.APPSYNC_API_URL,
        CLIENT_ID: process.env.CLIENT_ID,
        NEXT_PUBLIC_CLIENT_ID: process.env.NEXT_PUBLIC_CLIENT_ID,
    },
};

module.exports = nextConfig;
