/**
 * Who runs the service, shown in the footer, Terms and Privacy Policy.
 * The owner and contact come from the environment (see .env.example); the
 * legal pages flag them as missing until they're set.
 */
export const LEGAL = {
  productName: "Nuestro Camino",
  /** Person or company responsible for the service and its data. */
  ownerName: process.env.LEGAL_OWNER_NAME ?? "",
  contactEmail: process.env.CONTACT_EMAIL ?? "",
  country: "Argentina",
  /** Bump when Terms or Privacy change. */
  lastUpdated: "2026-10-20",
};

export const legalConfigMissing = () => !LEGAL.ownerName || !LEGAL.contactEmail;
