// Future Firebase adapters can implement the same reads and writes as services/storage.ts.
// Keeping persistence behind a service layer makes the prototype easy to promote later.
export const firebaseReady = {
  enabled: false,
};
