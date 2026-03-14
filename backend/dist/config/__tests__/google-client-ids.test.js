import assert from "node:assert/strict";
import test from "node:test";
import { parseGoogleClientIds } from "../google-client-ids.js";
test("prioriza APP_GOOGLE_CLIENT_ID, aceita lista e remove duplicados", () => {
    assert.deepEqual(parseGoogleClientIds(" app-client-id.apps.googleusercontent.com, legado-client-id.apps.googleusercontent.com ", "legado-client-id.apps.googleusercontent.com"), [
        "app-client-id.apps.googleusercontent.com",
        "legado-client-id.apps.googleusercontent.com"
    ]);
});
test("aceita apenas a variavel legada quando necessario", () => {
    assert.deepEqual(parseGoogleClientIds(undefined, " legado-client-id.apps.googleusercontent.com "), [
        "legado-client-id.apps.googleusercontent.com"
    ]);
});
