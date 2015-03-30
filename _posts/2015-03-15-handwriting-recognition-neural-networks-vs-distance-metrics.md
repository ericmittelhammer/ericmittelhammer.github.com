---
layout:     post
title:      "Handwriting Recognition: Neural Networks vs. Distance Metrics"
date:       2015-03-15 09:00:00
author:     "Eric Mittelhammer"
---

If you've ever taken a course on machine learning or artificial intelligence, the unit on neural networks most certainly had an exercise on handwriting recognition.  There's a reason for this: they're very good at generalizing problems tha have extremely fuzzy input.

Below is an embarrassingly un-scientific demo pitting a neural network against some much simpler distance metrics. I've trained a network from the [Brain.js](https://github.com/harthur/brain) library using the [Semeion Handwritten Digit Data Set](https://archive.ics.uci.edu/ml/datasets/Semeion+Handwritten+Digit).  You can draw a single digit 0-9 on the input canvas and run it through the trained net.  The output will be displayed on the right.  Underneath, your handwritten digit will be scaled down to 16x16 and  

<iframe src="./handwriting/index.html" style="width: 100%; height: 320px; border: none;"/>
