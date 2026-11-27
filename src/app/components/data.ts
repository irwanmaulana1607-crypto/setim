
export type ProjectFile = {
  name: string;
  path: string;
  language: string;
  content: string;
  repositoryId?: string;
};

export type ProjectFolder = {
  name: string;
  path: string;
  files: ProjectFile[];
  folders?: ProjectFolder[];
};

export type ProjectData = {
  id: string;
  name: string;
  owner: string;
  description: string;
  language: string;
  folders: ProjectFolder[];
  rootFiles: ProjectFile[];
  remoteId?: string;
};

export type FeedPost = {
  id: string;
  name: string;
  username: string;
  time: string;
  content: string;
  scope: "Following" | "Network";
  likes: number;
  replies: number;
  reposts: number;
  createdAt: number;
  imageUrl?: string;
  project?: ProjectData;
  projectId?: string;
  linkPreview?: LinkPreview;
  snippet?: CodeSnippet;
  poll?: PollData;
  topics?: Topic[];
  postType?: PostType;
};

export type LinkPreview = {
  url: string;
  title: string;
  description: string;
  thumbnail: string;
  domain: string;
};

export type CodeSnippet = {
  language: string;
  code: string;
};

export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

export type PollData = {
  id?: string;
  question: string;
  options: PollOption[];
  expiresAt?: string;
  votedOptionId?: string;
};

export type Topic = {
  id: string;
  name: string;
  slug: string;
};

export type PostType = "discussion" | "question" | "project_showcase" | "tutorial" | "announcement";

export const getProjectFileCount = (project: ProjectData): number => {
  const countFolderFiles = (folder: ProjectFolder): number =>
    folder.files.length + (folder.folders?.reduce(
      (total, childFolder) => total + countFolderFiles(childFolder),
      0
    ) ?? 0);

  return project.rootFiles.length + project.folders.reduce(
    (total, folder) => total + countFolderFiles(folder),
    0
  );
};

export const HELLO_WORLD_PROJECT: ProjectData = {
  id: "hello-world",
  name: "hello-world",
  owner: "alexmorgan",
  description: "A simple C++ project demonstrating basic programming.",
  language: "C++",

  folders: [
    {
      name: "src",
      path: "src",
      files: [
        {
          name: "main.cpp",
          path: "src/main.cpp",
          language: "cpp",
          content: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;

    return 0;
}`,
        },
      ],
    },
  ],

  rootFiles: [
    {
      name: "README.md",
      path: "README.md",
      language: "markdown",
      content: `# Hello World

A simple C++ project.

## Getting Started

Compile the project:

\`\`\`bash
g++ src/main.cpp -o main
\`\`\`

Run the program:

\`\`\`bash
./main
\`\`\`
`,
    },
    {
      name: ".gitignore",
      path: ".gitignore",
      language: "text",
      content: `*.exe
*.out
*.o
`,
    },
  ],
};

export const POSTS: FeedPost[] = [
  {
    id: "1",
    name: "Alex Morgan",
    username: "alexmorgan",
    time: "2h",
    content:
      "I have been working on a simple C++ project. Here is the source code for anyone who wants to review it.",
    scope: "Following",
    likes: 24,
    replies: 5,
    reposts: 3,
    createdAt: 4,
    project: HELLO_WORLD_PROJECT,
  },
  {
    id: "2",
    name: "Sarah Chen",
    username: "sarahchen",
    time: "3h",
    content:
      "Building something new takes patience, consistency, and collaboration.",
    scope: "Following",
    likes: 18,
    replies: 4,
    reposts: 2,
    createdAt: 3,
  },
  {
    id: "3",
    name: "Daniel Kim",
    username: "danielkim",
    time: "5h",
    content:
      "Sharing some thoughts about software development and open-source collaboration.",
    scope: "Network",
    likes: 42,
    replies: 8,
    reposts: 6,
    createdAt: 2,
  },
  {
    id: "4",
    name: "Maya Putri",
    username: "mayaputri",
    time: "6h",
    content:
      "What makes a good development team? Communication and shared understanding.",
    scope: "Network",
    likes: 31,
    replies: 7,
    reposts: 4,
    createdAt: 1,
  },
];
