const path = require('path');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const { Octokit } = require('@octokit/rest');

// Create Octokit instance
function createOctokitInstance(githubToken) {
  return new Octokit({
    auth: githubToken,
    request: { fetch },
  });
}

// Generate a unique repository name with a timestamp
function generateTimestamp() {
  const timestamp = new Date();
  return `build-${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getHours()).padStart(
    2,
    '0',
  )}-${String(timestamp.getMinutes()).padStart(2, '0')}-${String(timestamp.getSeconds()).padStart(
    2,
    '0',
  )}`;
}

// Initialize an empty repository with a README file
async function initializeEmptyRepo(octokit, owner, repo, branch, description) {
  try {
    console.log('Initializing empty repository...');

    const readmeContent = `# ${repo}\n\n${description || 'New repository created via GitHub API.'}`;
    const readmeBase64 = Buffer.from(readmeContent).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Initial commit: Added README',
      content: readmeBase64,
      branch,
    });

    console.log('Repository initialized with README.md.');
  } catch (error) {
    console.error('Failed to initialize repository:', error.response?.data || error.message);
    throw error;
  }
}

// Recursively gather files from the specified directory
async function gatherFiles(dirPath, basePath = '') {
  const files = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    const relativePath = path.join(basePath, item.name);

    if (item.isDirectory()) {
      files.push(...(await gatherFiles(fullPath, relativePath)));
    } else {
      const content = await fs.readFile(fullPath, 'utf-8');
      files.push({ path: relativePath, content });
    }
  }

  return files;
}

// Main function to upload files to GitHub with a new branch
async function uploadWithNewBranch(
  githubToken,
  repoOwner,
  repoName,
  folderPath,
  mainBranch = 'main',
) {
  const octokit = createOctokitInstance(githubToken);
  let isRepoEmpty = false;

  try {
    await octokit.git.getRef({
      owner: repoOwner,
      repo: repoName,
      ref: `heads/${mainBranch}`,
    });
  } catch (error) {
    if (error.status === 409) {
      isRepoEmpty = true;
    } else {
      throw error;
    }
  }

  if (isRepoEmpty) {
    await initializeEmptyRepo(octokit, repoOwner, repoName, mainBranch, 'Initial repository setup');
  }

  const timestampName = generateTimestamp();
  const filesToUpload = await gatherFiles(folderPath);
  console.log(`Uploading ${filesToUpload.length} files...`);

  const { data: refData } = await octokit.git.getRef({
    owner: repoOwner,
    repo: repoName,
    ref: `heads/${mainBranch}`,
  });

  const latestCommitSha = refData.object.sha;

  await octokit.git.createRef({
    owner: repoOwner,
    repo: repoName,
    ref: `refs/heads/${timestampName}`,
    sha: latestCommitSha,
  });

  const { data: commitData } = await octokit.git.getCommit({
    owner: repoOwner,
    repo: repoName,
    commit_sha: latestCommitSha,
  });

  const baseTreeSha = commitData.tree.sha;

  const treeEntries = await Promise.all(
    filesToUpload.map(async (file) => {
      const { data: blobData } = await octokit.git.createBlob({
        owner: repoOwner,
        repo: repoName,
        content: file.content,
        encoding: 'utf-8',
      });
      return {
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      };
    }),
  );

  const { data: treeData } = await octokit.git.createTree({
    owner: repoOwner,
    repo: repoName,
    base_tree: baseTreeSha,
    tree: treeEntries,
  });

  const { data: commitResponse } = await octokit.git.createCommit({
    owner: repoOwner,
    repo: repoName,
    message: `Latest code with ${timestampName}`,
    tree: treeData.sha,
    parents: [latestCommitSha],
  });

  await octokit.git.updateRef({
    owner: repoOwner,
    repo: repoName,
    ref: `heads/${timestampName}`,
    sha: commitResponse.sha,
  });

  console.log(`Files uploaded to branch: ${timestampName}`);
  return timestampName;
}

module.exports = {
  uploadWithNewBranch,
};
