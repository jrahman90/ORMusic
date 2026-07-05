# Firebase Setup

`firestore.js` initializes Firebase once and exports the Firebase services used by the app.

```js
export default getFirestore();
export { firestore, storage, auth };
```

Usage patterns in the codebase:

- `import db from "../../api/firestore/firestore"` for Firestore reads/writes.
- `import { storage } from "../../api/firestore/firestore"` for Storage uploads.
- `getAuth()` is also used directly in several components.

## Collections Used By The App

- `users`
- `inquiries`
- `rentals`
- `artists`
- `videos`
- `EventureContact`

See `docs/FIRESTORE_MODEL.md` for field-level details.

## Security Note

The Firebase web config is public client configuration. It does not secure the database by itself. Access control must be enforced with Firebase Auth plus Firestore and Storage security rules.

Admin UI visibility is controlled by `users/{uid}.isAdmin`, but client-side route gating should not be treated as the security boundary.
