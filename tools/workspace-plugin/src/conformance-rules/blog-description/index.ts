import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { load as yamlLoad } from 'js-yaml';
import { workspaceRoot } from '@nx/devkit';
import {
  createConformanceRule,
  type ProjectFilesViolation,
} from '@nx/powerpack-conformance';

export default createConformanceRule<object>({
  name: 'blog-description',
  category: 'consistency',
  description:
    'Ensures that blog posts have a description in their frontmatter',
  reporter: 'project-files-reporter',
  implementation: async ({ projectGraph }) => {
    const violations: ProjectFilesViolation[] = [];

    // Look for the blog project
    const docsProject = Object.values(projectGraph.nodes).find(
      (project) => project.data.root === 'docs'
    );

    if (!docsProject) {
      return {
        severity: 'medium',
        details: {
          violations: [],
        },
      };
    }

    const blogDir = join(workspaceRoot, docsProject.data.root, 'blog');
    const files = findMarkdownFiles(blogDir);

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

      // Only check files with frontmatter
      if (frontmatterMatch) {
        try {
          const frontmatter = yamlLoad(frontmatterMatch[1]) as Record<
            string,
            unknown
          >;

          if (!frontmatter.description) {
            violations.push({
              message:
                'Blog posts with frontmatter must have a description field',
              sourceProject: docsProject.name,
              file: file,
            });
          }
        } catch (e) {
          // If YAML parsing fails, we skip the file
          continue;
        }
      }
    }

    return {
      severity: 'high',
      details: {
        violations,
      },
    };
  },
});

function findMarkdownFiles(dir: string): string[] {
  const fs = require('fs');
  const path = require('path');
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}
