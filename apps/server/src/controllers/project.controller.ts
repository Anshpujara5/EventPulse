import type { Response } from "express";
import {
  createProject,
  getProjectByIdAndUserId,
  getProjectsByUserId,
} from "../data/memoryStore";
import type { AuthRequest } from "../middleware/auth.middleware";
import {
  isNonEmptyString,
  isValidDomain,
  normalizeString,
} from "../utils/validation";

export async function createProjectController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { name, domain, description } = req.body;

    if (!isNonEmptyString(name)) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    if (!isValidDomain(domain)) {
      return res.status(400).json({
        success: false,
        message: "Valid domain is required",
      });
    }

    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    const normalizedDescription =
      description === undefined ? undefined : normalizeString(description);

    const project = createProject({
      name: normalizeString(name),
      domain: normalizeString(domain),
      description: normalizedDescription,
      userId: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: {
        project,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getProjectsController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const projects = getProjectsByUserId(req.user.userId);

    return res.json({
      success: true,
      data: {
        projects,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getProjectByIdController(
  req: AuthRequest,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const project = getProjectByIdAndUserId(id, req.user.userId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
