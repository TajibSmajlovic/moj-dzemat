/**
   Shared contact types and pure helpers safe for both server and client.
   Keep Prisma / caching / env in `contact.server.ts`.
 */

export type CommunityInfoRecord = {
  showAbout: boolean;
  showContact: boolean;
  showImam: boolean;
  showBoard: boolean;
  showBank: boolean;
  showLocation: boolean;
  aboutText: string | null;
  imamName: string | null;
  imamPhone: string | null;
  imamEmail: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  officeHours: string | null;
  bankAccount: string | null;
  bankBeneficiary: string | null;
  bankName: string | null;
  bankSwift: string | null;
  bankNote: string | null;
  boardNote: string | null;
  updatedAt: Date;
};

export function toPublicCommunityInfo(info: CommunityInfoRecord): CommunityInfoRecord {
  return {
    ...info,
    aboutText: info.showAbout ? info.aboutText : null,
    imamName: info.showImam ? info.imamName : null,
    imamPhone: info.showImam ? info.imamPhone : null,
    imamEmail: info.showImam ? info.imamEmail : null,
    contactPhone: info.showContact ? info.contactPhone : null,
    contactEmail: info.showContact ? info.contactEmail : null,
    officeHours: info.showContact ? info.officeHours : null,
    bankAccount: info.showBank ? info.bankAccount : null,
    bankBeneficiary: info.showBank ? info.bankBeneficiary : null,
    bankName: info.showBank ? info.bankName : null,
    bankSwift: info.showBank ? info.bankSwift : null,
    bankNote: info.showBank ? info.bankNote : null,
    boardNote: info.showBoard ? info.boardNote : null,
  };
}

function hasText(value: string | null | undefined): boolean {
  return value != null && value.length > 0;
}

export function communityInfoHasContent(info: CommunityInfoRecord): boolean {
  return (
    (info.showAbout && hasText(info.aboutText)) ||
    (info.showImam &&
      (hasText(info.imamName) || hasText(info.imamPhone) || hasText(info.imamEmail))) ||
    (info.showContact &&
      (hasText(info.contactPhone) || hasText(info.contactEmail) || hasText(info.officeHours))) ||
    (info.showBank &&
      (hasText(info.bankAccount) ||
        hasText(info.bankBeneficiary) ||
        hasText(info.bankName) ||
        hasText(info.bankSwift) ||
        hasText(info.bankNote))) ||
    (info.showBoard && hasText(info.boardNote))
  );
}
