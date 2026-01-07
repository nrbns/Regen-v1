/* eslint-env node */
/**
 * One-Click Export to Notion/Obsidian/Roam
 * Converted from Python production code
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Export to Notion
 */
async function exportToNotion(contentMd, parentId) {
  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  if (!NOTION_API_KEY) {
    throw new Error('NOTION_API_KEY not configured');
  }

  // Convert Markdown to Notion blocks
  // Simple converter (extend for full MD support)
  const blocks = convertMarkdownToNotionBlocks(contentMd);

  const headers = {
    Authorization: `Bearer ${NOTION_API_KEY}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28', // Use latest supported version
  };

  const data = {
    parent: parentId ? { page_id: parentId } : { type: 'workspace' },
    properties: {
      title: {
        title: [{ text: { content: 'Regen Research Export' } }],
      },
    },
    children: blocks,
  };

  try {
    const response = await axios.post('https://api.notion.com/v1/pages', data, { headers });
    return {
      success: true,
      url: response.data.url || response.data.id,
      pageId: response.data.id,
    };
  } catch (error) {
    throw new Error(`Notion export failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Convert Markdown to Notion blocks
 * Simple converter - extend for full MD support
 */
function convertMarkdownToNotionBlocks(md) {
  const blocks = [];
  const lines = md.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Headings
    if (trimmed.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: trimmed.substring(2) } }],
        },
      });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: trimmed.substring(3) } }],
        },
      });
    } else if (trimmed.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: trimmed.substring(4) } }],
        },
      });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // Bullet list
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: trimmed.substring(2) } }],
        },
      });
    } else if (/^\d+\.\s/.test(trimmed)) {
      // Numbered list
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: trimmed.replace(/^\d+\.\s/, '') } }],
        },
      });
    } else {
      // Paragraph
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: trimmed } }],
        },
      });
    }
  }

  return blocks;
}

/**
 * Export to Obsidian (generate download file)
 */
async function exportToObsidian(contentMd) {
  // Generate file for download
  const filename = `regen_export_${Date.now()}.md`;
  const tempPath = path.join(__dirname, '../../tmp', filename);

  // Ensure tmp directory exists
  const tmpDir = path.dirname(tempPath);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  fs.writeFileSync(tempPath, contentMd, 'utf-8');

  return {
    success: true,
    filename,
    path: tempPath,
    content: contentMd,
  };
}

/**
 * Export to Roam
 */
async function exportToRoam(contentMd, graphName) {
  const ROAM_API_EMAIL = process.env.ROAM_API_EMAIL;
  const ROAM_API_PASSWORD = process.env.ROAM_API_PASSWORD;
  const ROAM_API_GRAPH = graphName || process.env.ROAM_API_GRAPH;

  if (!ROAM_API_EMAIL || !ROAM_API_PASSWORD || !ROAM_API_GRAPH) {
    throw new Error('Roam API credentials not configured');
  }

  // Write MD to temp file
  const tempFile = path.join(__dirname, '../../tmp', `roam_export_${Date.now()}.md`);
  const tmpDir = path.dirname(tempFile);
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  fs.writeFileSync(tempFile, contentMd, 'utf-8');

  try {
    // Use roam-api CLI (requires: npm i -g roam-research-private-api)
    // Note: This is a simplified version - full implementation would use the Roam API directly
    const command = `roam-api create --graph "${ROAM_API_GRAPH}" --email "${ROAM_API_EMAIL}" --password "${ROAM_API_PASSWORD}" "${tempFile}"`;

    await execAsync(command);

    return {
      success: true,
      status: 'imported to Roam',
      graph: ROAM_API_GRAPH,
    };
  } catch {
    // Fallback: Return file for manual import
    return {
      success: true,
      status: 'file_ready',
      file: tempFile,
      message: 'Roam CLI not available. File ready for manual import.',
    };
  } finally {
    // Cleanup temp file after a delay (or keep for manual import)
    setTimeout(() => {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }, 60000); // Keep for 1 minute
  }
}

/**
 * Main export function
 */
export async function exportToTool(contentMd, tool, options = {}) {
  const { parentId, graphName } = options;

  switch (tool) {
    case 'notion':
      return await exportToNotion(contentMd, parentId);

    case 'obsidian':
      return await exportToObsidian(contentMd);

    case 'roam':
      return await exportToRoam(contentMd, graphName);

    default:
      throw new Error(`Invalid tool: ${tool}. Supported: notion, obsidian, roam`);
  }
}







