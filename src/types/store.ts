// Mock-only client shapes still used by unwired store sheets (addresses).
// Catalog types live in `src/lib/store/*.schemas.ts` and are Zod-inferred.

export type AddressLabel = "HOME" | "WORK" | "OTHER";

export type Address = {
  id: string;
  recipientName: string;
  pincode: string;
  fullAddress: string;
  label: AddressLabel;
};
