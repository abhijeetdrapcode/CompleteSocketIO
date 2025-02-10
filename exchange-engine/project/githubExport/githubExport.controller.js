import { uploadWithNewBranch } from './githubExport.services';
import dotenv from 'dotenv';

dotenv.config();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
console.log('This is the github client id: ', GITHUB_CLIENT_ID);
console.log('This is the github client secret: ', GITHUB_CLIENT_SECRET);

export const uploadToGithub = async (req, res) => {
  console.log('Here the api call is being made ');
  const { githubToken, repoOwner, repoName, folderPath, mainBranch = 'main' } = req.body;

  console.log(
    'This is the data from the backend: ',
    githubToken,
    repoOwner,
    repoName,
    folderPath,
    mainBranch,
  );

  if (!githubToken || !repoOwner || !repoName || !folderPath) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const branchName = await uploadWithNewBranch(
      githubToken,
      repoOwner,
      repoName,
      folderPath,
      mainBranch,
    );

    res.json({
      message: 'Files uploaded successfully',
      branch: branchName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload files',
      details: error.message,
    });
  }
};

import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip'; // Install with npm install adm-zip
// import fs from 'fs';
// import path from 'path';
// import AdmZip from 'adm-zip';

export const uploadToGithubZip = async (req, res) => {
  const { githubToken, repoOwner, repoName, folderPath, mainBranch = 'main' } = req.body;

  console.log('This is the req.body of the zip route: ', req.body);
  if (!githubToken || !repoOwner || !repoName || !folderPath) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Find the first ZIP file in the specified folder
    const files = fs.readdirSync(folderPath);
    const zipFile = files.find((file) => path.extname(file).toLowerCase() === '.zip');

    if (!zipFile) {
      throw new Error('No ZIP file found in the specified folder');
    }

    const zipFilePath = path.join(folderPath, zipFile);
    const extractPath = path.join(folderPath, 'extracted-' + Date.now());

    // Extract the ZIP file
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(extractPath, true);

    // Find the first subdirectory in the extracted folder
    const extractedContents = fs.readdirSync(extractPath);
    const subFolder = extractedContents.find((item) =>
      fs.statSync(path.join(extractPath, item)).isDirectory(),
    );

    if (!subFolder) {
      throw new Error('No subdirectory found in the extracted ZIP');
    }

    const contentPath = path.join(extractPath, subFolder);

    // Upload the contents of the subdirectory
    const branchName = await uploadWithNewBranch(
      githubToken,
      repoOwner,
      repoName,
      contentPath,
      mainBranch,
    );

    // Cleanup
    fs.rmSync(extractPath, { recursive: true, force: true });
    fs.unlinkSync(zipFilePath);

    return res.json({
      success: true,
      message: 'Files uploaded successfully',
      branch: branchName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to upload files',
      details: error.message,
    });
  }
};
