import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const packagesDir = path.resolve(__dirname, '../packages');

interface PackageJson {
    name: string;
    version: string;
}

async function getSubmoduleHash(pkgPath: string): Promise<string | null> {
    try {
        const gitPath = path.join(pkgPath, '.git');
        const gitExists = await fs.stat(gitPath).then(() => true).catch(() => false);
        if (!gitExists) return null;

        // Get current branch
        let currentBranch: string;
        try {
            const { stdout: branchStdout } = await execAsync(`git -C ${pkgPath} rev-parse --abbrev-ref HEAD`);
            currentBranch = branchStdout.trim();

            if (currentBranch === 'HEAD') {
                const { stdout: headRef } = await execAsync(`git -C ${pkgPath} symbolic-ref refs/remotes/origin/HEAD`);
                currentBranch = headRef.trim().replace('refs/remotes/origin/', '');
            }
        } catch {
            console.warn(`⚠️ Could not detect current branch for ${pkgPath}. Skipping.`);
            return null;
        }

        // Detect base branch (main or master)
        let baseBranch = 'main';
        try {
            await execAsync(`git -C ${pkgPath} show-ref --verify --quiet refs/remotes/origin/main`);
        } catch {
            baseBranch = 'master';
        }

        // Find merge base (common ancestor)
        const { stdout: baseHash } = await execAsync(
            `git -C ${pkgPath} merge-base origin/${baseBranch} ${currentBranch}`
        );

        return baseHash.trim().slice(0, 7);
    } catch (err) {
        console.warn(`⚠️ Could not get submodule base hash in ${pkgPath}: ${(err as Error).message}`);
        return null;
    }
}

async function updatePackageVersion(pkgPath: string, hash: string): Promise<void> {
    const pkgJsonPath = path.join(pkgPath, 'package.json');

    try {
        const data = await fs.readFile(pkgJsonPath, 'utf-8');
        const pkg: PackageJson = JSON.parse(data);

        const dashSplit = pkg.version.split('-')
        const split = dashSplit.length > 1 ? dashSplit : pkg.version.split('+')
        const baseVersion = split[0];
        const newVersion = `${baseVersion}+commit.${hash}`;

        pkg.version = newVersion;

        await fs.writeFile(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
        console.log(`✅ Updated ${pkg.name} to version ${newVersion}`);
    } catch (err) {
        console.error(`❌ Failed to update version in ${pkgJsonPath}: ${(err as Error).message}`);
    }
}

async function findSubmoduleDir(pkgPath: string): Promise<string | null> {
    const entries = await fs.readdir(pkgPath, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const subDirPath = path.join(pkgPath, entry.name);
            const gitPath = path.join(subDirPath, '.git');

            try {
                const gitStat = await fs.stat(gitPath);
                if (gitStat.isDirectory() || gitStat.isFile()) {
                    return subDirPath;
                }
            } catch {
                continue; // Not a submodule
            }
        }
    }

    return null;
}

async function run(): Promise<void> {
    const targetFolder = process.argv[2];

    if (!targetFolder) {
        console.error('❌ Please provide a folder name as the first argument, e.g. `ts-node update-versions.ts my-package`');
        process.exit(1);
    }

    const pkgPath = path.join(packagesDir, targetFolder);

    try {
        const stat = await fs.stat(pkgPath).catch(() => null);
        if (!stat || !stat.isDirectory()) {
            console.error(`❌ Folder not found: ${pkgPath}`);
            process.exit(1);
        }

        const submodulePath = await findSubmoduleDir(pkgPath);
        if (!submodulePath) {
            console.error(`❌ No submodule found in ${pkgPath}`);
            process.exit(1);
        }

        const hash = await getSubmoduleHash(submodulePath);
        if (!hash) {
            console.error(`❌ Could not determine submodule hash for ${pkgPath}`);
            process.exit(1);
        }

        await updatePackageVersion(pkgPath, hash);
    } catch (err) {
        console.error(`❌ Failed to update version: ${(err as Error).message}`);
        process.exit(1);
    }
}

run();