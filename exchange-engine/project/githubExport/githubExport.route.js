import express from 'express';
import { uploadToGithub, uploadToGithubZip } from './githubExport.controller';

const githubRouter = express.Router();

githubRouter.post('/github-upload', uploadToGithub);
githubRouter.post('/github-upload-zip', uploadToGithubZip);

export default githubRouter;
