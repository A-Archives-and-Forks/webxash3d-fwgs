import fs from 'fs/promises'

const FILE_PATH = process.env.FILE_PATH || 'package.json'

async function main() {
    try {
        await fs.access(FILE_PATH);
    } catch (e) {
        return;
    }

    const providers = JSON.parse(process.env.MONOREL_UPDATED_PROVIDERS || '[]')
    const pkgBuf = await fs.readFile(FILE_PATH);
    const pkg = JSON.parse(pkgBuf.toString());
    providers.forEach((p: { package: string, space: string, oldVersion: string, newVersion: string }) => {
        if (p.space !== 'npm') return;

        if (pkg.dependencies?.[p.package]) {
            pkg.dependencies[p.package] = p.newVersion;
        }
        if (pkg.devDependencies?.[p.package]) {
            pkg.devDependencies[p.package] = p.newVersion;
        }
    });

    await fs.writeFile(FILE_PATH, JSON.stringify(pkg, null, 2) + '\n')
}

main()