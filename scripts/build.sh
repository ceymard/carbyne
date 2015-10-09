#!/bin/bash
babel -L es6.forOf,es6.classes,es6.templateLiterals -P elt -s inline --stage 0 -d elt src
