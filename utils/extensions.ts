import path from 'path';
import { Extension } from '../agent';
import { Agent, Extension as PrismaExtension, Workspace } from '@prisma/client';

type AgentWithExtensions = Agent & {
  extensions: {
    extension: PrismaExtension;
    enabled: boolean;
  }[];
  workspaces: {
    workspace: Workspace & {
      extensions: {
        extension: PrismaExtension;
        enabled: boolean;
      }[];
    };
    useAllExtensions: boolean;
  }[];
};

async function loadExtension(name: string): Promise<Extension | null> {
  try {
    const extensionModule = await import(path.join('../extensions', name));
    return extensionModule.default;
  } catch (error) {
    console.error(`Failed to load extension ${name}:`, error);
    return null;
  }
}

export async function loadAgentExtensions(agent: AgentWithExtensions): Promise<Extension[]> {
  const extensionsMap = new Map<string, Extension>();
  
  // Load agent-specific extensions
  for (const ext of agent.extensions) {
    if (ext.enabled) {
      const extension = await loadExtension(ext.extension.name);
      if (extension) {
        extensionsMap.set(ext.extension.name, extension);
      }
    }
  }

  // Load workspace extensions
  for (const wa of agent.workspaces) {
    if (wa.useAllExtensions) {
      for (const ext of wa.workspace.extensions) {
        if (ext.enabled && !extensionsMap.has(ext.extension.name)) {
          const extension = await loadExtension(ext.extension.name);
          if (extension) {
            extensionsMap.set(ext.extension.name, extension);
          }
        }
      }
    }
  }

  return Array.from(extensionsMap.values());
} 