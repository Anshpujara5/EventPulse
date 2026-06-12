import crypto from "crypto";

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Project = {
  id: string;
  name: string;
  domain: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

const users: User[] = [];
const projects: Project[] = [];

export function findUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email === email);
}

export function findUserById(id: string): User | undefined {
  return users.find((user) => user.id === id);
}

export function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): User {
  const now = new Date();
  const user: User = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    createdAt: now,
    updatedAt: now,
  };

  users.push(user);

  return user;
}

export function createProject(input: {
  name: string;
  domain: string;
  description?: string;
  userId: string;
}): Project {
  const now = new Date();
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name,
    domain: input.domain,
    description: input.description,
    status: "ACTIVE",
    userId: input.userId,
    createdAt: now,
    updatedAt: now,
  };

  projects.push(project);

  return project;
}

export function getProjectsByUserId(userId: string): Project[] {
  return projects.filter((project) => project.userId === userId);
}

export function getProjectByIdAndUserId(
  id: string,
  userId: string,
): Project | undefined {
  return projects.find(
    (project) => project.id === id && project.userId === userId,
  );
}
