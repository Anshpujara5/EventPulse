import type { Response } from "express";
import {
  createProject,
  getProjectByIdAndUserId,
  getProjectsByUserId,
} from "../data/memoryStore";
import type { AuthRequest } from "../middleware/auth.middleware";

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

    if (!name || !domain) {
      return res.status(400).json({
        success: false,
        message: "Project name and domain are required",
      });
    }

    const project = createProject({
      name,
      domain,
      description,
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
