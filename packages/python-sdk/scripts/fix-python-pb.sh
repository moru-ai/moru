#!/bin/bash

rm -rf moru/envd/__pycache__
rm -rf moru/envd/filesystem/__pycache__
rm -rf moru/envd/process/__pycache__

sed -i.bak 's/from\ process\ import/from moru.envd.process import/g' moru/envd/process/* moru/envd/filesystem/*
sed -i.bak 's/from\ filesystem\ import/from moru.envd.filesystem import/g' moru/envd/process/* moru/envd/filesystem/*

rm -f moru/envd/process/*.bak
rm -f moru/envd/filesystem/*.bak
