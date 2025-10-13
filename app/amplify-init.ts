'use client';
import { Amplify } from 'aws-amplify';
import amplifyConfig from "@/app/amplify-config";

let configured = false;

export function initAmplify() {
    if (configured) return;
    Amplify.configure(amplifyConfig);
    configured = true;

}
