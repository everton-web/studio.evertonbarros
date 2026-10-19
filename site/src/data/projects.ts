export interface Project {
  slug: string;
  title: string;
  category: string;
  url: string;
  cover: string;
  year: number;
}

export const projects: Project[] = [
  {
    slug: "concept-implantes",
    title: "Concept Implantes Dentários",
    category: "One Page · Web Design",
    url: "https://www.behance.net/gallery/255951785/Site-One-Page-para-Clinica-Odontologica-Concept",
    cover: "/projects/concept.png",
    year: 2026,
  },
  {
    slug: "agfp-transportes",
    title: "AGFP Transportes",
    category: "One Page · Web Design",
    url: "https://www.behance.net/gallery/241985859/AGFP-Transportes-One-Page",
    cover: "/projects/agfp.png",
    year: 2025,
  },
  {
    slug: "dental-class",
    title: "Dental Class",
    category: "One Page · Web Design",
    url: "https://www.behance.net/gallery/241985255/Dental-Class-One-Page",
    cover: "/projects/dental-class.png",
    year: 2025,
  },
  {
    slug: "casa-repouso-joinville",
    title: "Casa de Repouso de Joinville",
    category: "One Page · UX Design",
    url: "#",
    cover: "/projects/casa-repouso.png",
    year: 2025,
  },
  {
    slug: "allmeida-midias",
    title: "Allmeida Mídias",
    category: "Landing Page",
    url: "https://www.behance.net/gallery/217732821/Allmeida-midias-Landing-Page",
    cover: "/projects/allmeida.png",
    year: 2024,
  },
  {
    slug: "balan-arquitetos",
    title: "Balan Arquitetos",
    category: "Brand Identity",
    url: "#",
    cover: "/projects/balan.png",
    year: 2024,
  },
  {
    slug: "ipower",
    title: "iPower",
    category: "One Page · Web Design",
    url: "https://www.behance.net/gallery/198869793/iPower-Support-Shop-Lab-One-Page",
    cover: "/projects/ipower.png",
    year: 2024,
  },
];
