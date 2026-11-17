export type Member = {
  id: string;
  name: string;
  displayName: string;
  university: string;
  universityShort: "TU" | "USM" | "BUET";
  country: string;
  role: string;
  contribution: string;
  photo: string;
  /** true when the role text still needs the team's confirmation */
  roleToConfirm?: boolean;
};

export const members: Member[] = [
  {
    id: "pradip",
    name: "Pradip Gyawali",
    displayName: "Pradip",
    university: "Tribhuvan University",
    universityShort: "TU",
    country: "Nepal",
    role: "Networking & DNS",
    contribution: "Camp network and naming services.",
    photo: "/images/team/pradip.jpg",
    roleToConfirm: true,
  },
  {
    id: "andrrew",
    name: "Andrrew",
    displayName: "Andrrew",
    university: "Universiti Sains Malaysia",
    universityShort: "USM",
    country: "Malaysia",
    role: "GLOF simulator & fusion logic",
    contribution: "First GANGA simulator: corridor replay, broadcast model, CAP preview.",
    photo: "/images/team/andrrew.jpg",
  },
  {
    id: "swarnima",
    name: "Swarnima Khadka",
    displayName: "Swarnima",
    university: "Tribhuvan University",
    universityShort: "TU",
    country: "Nepal",
    role: "Network design",
    contribution: "GANGA network in Cisco Packet Tracer. VLANs, OSPF, WAN failover test.",
    photo: "/images/team/swarnima.jpg",
  },
  {
    id: "sohan",
    name: "Minhazul Hasan",
    displayName: "Sohan",
    university: "Bangladesh University of Engineering and Technology",
    universityShort: "BUET",
    country: "Bangladesh",
    role: "Alert engine, Command Center & cloud",
    contribution: "Fusion engine, Command Center, CAP feed, cloud pipeline.",
    photo: "/images/team/sohan.jpg",
  },
];

export const mentor = {
  name: "Nitesh Baniya",
  role: "Teaching Assistant & Mentor",
  note: "Guided the build and tested every configuration.",
  photo: "/images/team/nitesh.jpg",
};

export const teamPhotos = {
  banner: {
    src: "/images/camp/group-banner.jpg",
    alt: "Team PASS with mentor Nitesh Baniya in front of the APIE Camp #11 banner at Pulchowk Campus, Tribhuvan University",
    width: 2048,
    height: 1365,
    credit: "Photo: APIE Camp #11",
  },
  lab: {
    src: "/images/camp/lab-team-pass.jpg",
    alt: "Team PASS at the lab bench during APIE Camp #11, with the switch and laptops they worked on",
    width: 2048,
    height: 1152,
    credit: "Photo: Team PASS",
  },
};

export const universities = [
  { short: "TU", name: "Tribhuvan University", country: "Nepal", logo: "/brand/uni-tu.png" },
  { short: "USM", name: "Universiti Sains Malaysia", country: "Malaysia", logo: "/brand/uni-usm.png" },
  { short: "BUET", name: "Bangladesh University of Engineering and Technology", country: "Bangladesh", logo: "/brand/uni-buet.png" },
] as const;
