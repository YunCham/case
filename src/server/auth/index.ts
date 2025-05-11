import NextAuth from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };

// // Exportar los servicios
// export * from "~/services/canvas-capture";
// export * from "~/services/gemini-processor";
// export * from "~/services/langchain-processor";
// export * from "~/services/flutter-exporter";