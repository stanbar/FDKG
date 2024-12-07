#!/bin/sh

# How to: https://github.com/gunnarmorling/hugo/blob/2502ca05cf64713fcf053582a2696d927a3ac3d0/docs/content/tutorials/github-pages-blog.md#deployment-via-gh-pages-branch

if [ "`git status -s`" ]
then
    echo "The working directory is dirty. Please commit any pending changes."
    exit 1;
fi


echo "Deleting old publication"
rm -rf public
mkdir public
git worktree prune
rm -rf .git/worktrees/public/

echo "Checking out gh-pages branch into public"
git worktree add -B gh-pages public origin/gh-pages

echo "Removing existing files"
rm -rf public/*

echo "Generating site"
yarn workspace app build && \
echo "Updating gh-pages branch" && \
cd public && git add --all && git commit -m "Publishing to gh-pages (publish.sh)" && \
echo "Pushing to github" && \
git push --all