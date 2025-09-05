#!/usr/bin/env node

import path from 'path'
import fs from 'fs'

/**
 * GitHub Repository Stats Fetcher
 * Fetches stars and watchers count for an array of GitHub repository URLs
 */

/**
 * Extract owner and repo name from GitHub URL
 * @param {string} url - GitHub repository URL
 * @returns {object|null} - {owner, repo} or null if invalid
 */
function parseGitHubUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;

    return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, '') // Remove .git suffix if present
    };
}

/**
 * Fetch repository stats from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} token - GitHub personal access token (optional)
 * @returns {Promise<object>} - Repository stats
 */
async function fetchRepoStats(owner, repo, token = null) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Stats-Fetcher'
    };

    // Add authorization header if token is provided
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    try {
        const response = await fetch(apiUrl, { headers });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        console.log('------------------------')
        console.log(JSON.stringify(data, null, 2));
        console.log('------------------------')

        return {
            id: data.id,
            url: data.html_url,
            name: data.name,
            description: data.description,
            owner: data.owner.login,
            stars: data.stargazers_count,
            watchers: data.subscribers_count,
            issues: data.open_issues_count,
            forks: data.forks_count,
            createdDate: data.created_at,
            modifiedDate: data.updated_at,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Add delay between requests to avoid rate limiting
 * @param {number} ms - Milliseconds to wait
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main function to process all repository URLs
 * @param {string[]} urls - Array of GitHub repository URLs
 * @param {string} token - GitHub personal access token (optional but recommended)
 * @returns {Promise<object[]>} - Array of repository stats
 */
async function getRepoStats(urls, token = null) {
    const results = [];

    console.log(`Processing ${urls.length} repositories...`);

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        console.log(`\nProcessing ${i + 1}/${urls.length}: ${url}`);

        const parsed = parseGitHubUrl(url);
        if (!parsed) {
            console.log(`❌ Invalid GitHub URL: ${url}`);
            results.push({
                url,
                error: 'Invalid GitHub URL format',
                stars: null,
                watchers: null
            });
            continue;
        }

        const stats = await fetchRepoStats(parsed.owner, parsed.repo, token);

        if (stats.error) {
            console.log(`❌ Error: ${stats.error}`);
        } else {
            console.log(`✅ ${stats.fullName}: ${stats.stars} stars, ${stats.subscribers} watchers`);
        }

        results.push(stats);

        // Add delay to avoid hitting rate limits (especially for unauthenticated requests)
        if (i < urls.length - 1) {
            await delay(1000); // 1 second delay between requests
        }
    }

    return results;
}

async function getRepoInfo(url) {
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
        console.log(`❌ Invalid GitHub URL: ${url}`);
    }
 
    const stats = await fetchRepoStats(parsed.owner, parsed.repo, process.env.GITHUB_PACKAGES_TOKEN);
    return stats
}

/**
 * Display results in a formatted table
 * @param {object[]} results - Array of repository stats
 */
function displayResults(results) {
    console.log('\n' + '='.repeat(80));
    console.log('REPOSITORY STATS SUMMARY');
    console.log('='.repeat(80));

    results.forEach((repo, index) => {
        console.log(`\n${index + 1}. ${repo.fullName || repo.url}`);

        if (repo.error) {
            console.log(`   ❌ Error: ${repo.error}`);
        } else {
            console.log(`   ⭐ Stars: ${repo.stars?.toLocaleString() || 'N/A'}`);
            console.log(`   👀 Watchers: ${repo.subscribers?.toLocaleString() || 'N/A'}`);
            console.log(`   🍴 Forks: ${repo.forks?.toLocaleString() || 'N/A'}`);
            console.log(`   💻 Language: ${repo.language || 'N/A'}`);
            if (repo.description) {
                console.log(`   📝 Description: ${repo.description.substring(0, 100)}${repo.description.length > 100 ? '...' : ''}`);
            }
        }
    });

    // Summary statistics
    const validRepos = results.filter(r => !r.error);
    const totalStars = validRepos.reduce((sum, repo) => sum + (repo.stars || 0), 0);
    const totalWatchers = validRepos.reduce((sum, repo) => sum + (repo.subscribers || 0), 0);

    console.log('\n' + '='.repeat(80));
    console.log(`Total repositories processed: ${results.length}`);
    console.log(`Successful requests: ${validRepos.length}`);
    console.log(`Failed requests: ${results.length - validRepos.length}`);
    console.log(`Total stars across all repos: ${totalStars.toLocaleString()}`);
    console.log(`Total watchers across all repos: ${totalWatchers.toLocaleString()}`);
    console.log('='.repeat(80));
}

/**
 * Save results to JSON file (Node.js environment)
 * @param {object[]} results - Array of repository stats
 * @param {string} filename - Output filename
 */
function saveToFile(results, filename = 'custom-nodes.json') {
    fs.writeFileSync(`./wwwroot/data/${filename}`, JSON.stringify(results, null, 2));
    console.log(`\n📁 Results saved to ${filename}`);
}

// Main execution
async function main() {
    // Optional: Add your GitHub personal access token here for higher rate limits
    // Get one at: https://github.com/settings/tokens
    
    const customNodesListJson = fs.readFileSync('./wwwroot/data/custom-node-list.json', 'utf8')
    const customNodeList = JSON.parse(customNodesListJson)
    const extensionNodeMapJson = fs.readFileSync('./wwwroot/data/extension-node-map.json', 'utf8')
    const extensionNodeMap = JSON.parse(extensionNodeMapJson)
    const customNodesJson = fs.readFileSync('./wwwroot/data/custom-nodes.json', 'utf8')
    const customNodes = JSON.parse(customNodesJson)
    // customNodes.length = 0
    
    const repoUrls = new Set()

    customNodeList.custom_nodes.forEach(node => {
        if (node.install_type !== 'git-clone') return
        node.files?.forEach(file => {
            if (file.endsWith('.git')) {
                console.log('removing .git from', file)
                file = file.slice(0, -4)
            }
            if (file.endsWith('.py')) {
                console.log('Not a github url:', file)
                return
            }
            if (file?.startsWith('https://github.com/')) {
                repoUrls.add(file)
            }
        })
    })
    
    Object.keys(extensionNodeMap).forEach(url => {
        if (url?.startsWith('https://github.com/')) {
            if (!repoUrls.has(url)) {
                repoUrls.add(url)
                console.log('Not in custom nodes:', url)
            }
        } else {
            console.log('Not a github url:', url)
        }
    })
    
    const customNodesMap = {}
    customNodes.forEach(node => {
        customNodesMap[node.url] = node
    })
    
    function toTitle(name) {
        if (!name) return null
        name = name.replace(/[-_]/g, ' ').replace(/comfyui/gi, 'ComfyUI')
        return name.split(' ').filter(x => x).map(x => x[0].toUpperCase() + x.slice(1)).join(' ')
    }
    
    repoUrls.forEach(url => {
        if (customNodesMap[url]) return
        
        const customNode = customNodeList.custom_nodes.find(x => x.files?.includes(url))
        const nodeExt = extensionNodeMap[url]
        const node = {
            id: 0,
            url,
            name: toTitle(customNode?.title),
            description: customNode?.description || null,
            owner: null,
            author: customNode?.author || null,
            stars: null,
            watchers: null,
            issues: null,
            forks: null,
            nodes: nodeExt?.[0] ?? [],
            createdDate: null,
            modifiedDate: null,
        }
        customNodes.push(node)
        customNodesMap[url] = node
    })
    
    saveToFile(customNodes)
    
    const pendingUrls = customNodes.filter(x => !x.id).map(x => x.url)

    console.log(`Pending Nodes: ${pendingUrls.length}/${customNodes.length}`);

    for (let i = 0; i < pendingUrls.length; i++) {
        
        const url = pendingUrls[i]
        console.log(`Processing ${i + 1}/${pendingUrls.length}: ${url}`);
        
        const repo = await getRepoInfo(url)
        if (!repo) {
            console.log(`❌ Error: (${url})`);
            continue
        }
        const node = customNodesMap[url]
        node.id = repo.id
        node.description = repo.description
        node.owner = repo.owner
        node.stars = repo.stars
        node.watchers = repo.watchers
        node.issues = repo.issues
        node.forks = repo.forks
        node.createdDate = repo.createdDate
        node.modifiedDate = repo.modifiedDate

        saveToFile(customNodes)
    }
    
    return null
    
    //console.log(JSON.stringify([...repoUrls], null, 2));
    console.log('\n' + '='.repeat(80));
    
    //console.log('keys', Object.keys(extensionNodeMap).slice(10))
    
    console.log(`Total repositories: ${repoUrls.size}`); //2872
    
    const GITHUB_TOKEN = process.env.GITHUB_PACKAGES_TOKEN; // Replace with your token: 'ghp_xxxxxxxxxxxx'

    try {
        const results = await getRepoStats(pendingUrls, GITHUB_TOKEN);

        results.forEach((repo) => {
            const node = customNodesMap[repo.url]
            if (node) {
                node.id = repo.id
                node.description = repo.description
                node.owner = repo.owner
                node.stars = repo.stars
                node.watchers = repo.watchers
                node.issues = repo.issues
                node.forks = repo.forks
                node.createdDate = repo.createdDate
                node.modifiedDate = repo.modifiedDate
            }
        })

        saveToFile(customNodes);

        // displayResults(results);
        
        // Uncomment to save results to file (Node.js only)
        // return results;
    } catch (error) {
        console.error('❌ Script failed:', error.message);
    }
}

main();
