import type { DzematConfig } from "#app/lib/dzemat-config";

/**
   Identity of the džemat this deployment serves. A fork for another džemat
   edits this file and replaces the images listed in
   docs/deploy-your-dzemat.md. The build rejects invalid values.
 */
export const dzematConfig = {
  // Appended to the product name: "Moj Džemat - Donje Moštre".
  name: "Donje Moštre",

  // Short line under the name in the header and on the offline page.
  tagline: "Rijaset Islamske zajednice u BiH",

  // Screen-reader description of `public/logo.svg`.
  logoAlt: "Logo Islamske zajednice",

  // Organizations the džemat operates within, from the broadest to the
  // closest. `nameGenitive` completes the footer sentence "Džemat Donje
  // Moštre djeluje u okviru …". Without `url`, the footer shows plain text.
  organizations: [
    {
      name: "Rijaset Islamske zajednice u Bosni i Hercegovini",
      nameGenitive: "Rijaseta Islamske zajednice u Bosni i Hercegovini",
      url: "https://islamskazajednica.ba/",
    },
    {
      name: "Muftijstvo sarajevsko",
      nameGenitive: "Muftijstva sarajevskog",
      url: "https://muftijstvosarajevsko.ba/",
    },
    {
      name: "Medžlis Islamske zajednice Visoko",
      nameGenitive: "Medžlisa Islamske zajednice Visoko",
      url: "https://muftijstvosarajevsko.ba/medzlis-islamske-zajednice-visoko/",
    },
  ],

  // Optional map on the homepage and contact page. `address` is displayed;
  // `mapQuery` is what Google Maps searches and defaults to `address`.
  // Remove the whole `location` entry to hide the map.
  location: {
    address: "Džamija Donje Moštre, Visoko, Bosna i Hercegovina",
    mapQuery: "Džamija Donje Moštre, R445, Visoko, Bosna i Hercegovina",
  },

  // Official profiles. Remove a key to hide its links.
  socialLinks: {
    facebook: "https://www.facebook.com/profile.php?id=100085095166223",
    youtube: "https://www.youtube.com/@DzematDonjeMostre",
  },
} satisfies DzematConfig;
