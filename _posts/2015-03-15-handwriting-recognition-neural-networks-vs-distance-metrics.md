---
layout:     post
title:      "Handwriting Recognition: Neural Networks vs. Distance Metrics"
date:       2015-03-15 09:00:00
author:     "Eric Mittelhammer"
---

If you've ever taken a course on machine learning or artificial intelligence, the unit on neural networks most certainly had an exercise on handwriting recognition.  There's a reason for this: they're very good at generalizing problems that have extremely fuzzy input.

Below is an embarrassingly un-scientific demo which pits a neural network against some much simpler distance metrics.

I've trained a network from the [Brain.js](https://github.com/harthur/brain) library using the [Semeion Handwritten Digit Data Set](https://archive.ics.uci.edu/ml/datasets/Semeion+Handwritten+Digit).  The canvas on the left-hand side will let you draw a digit which will be scaled down to 16x16 size (the same as the digits in the Semeion set) and run through the net.  The box on the right will display which digit the net thinks you wrote.  Below that, you'll see the scaled-down representation of your digit, and the closest digit in the Semeion set as determined by [Hamming](http://en.wikipedia.org/wiki/Hamming_distance), [Jaccard](http://en.wikipedia.org/wiki/Jaccard_index), and [Tanimoto](http://stn.spotfire.com/spotfire_client_help/hc/hc_tanimoto_coefficient.htm) distances.

<iframe src="./handwriting/index.html" style="width: 100%; height: 320px; border: none;"></iframe>

Some things to consider:

* The canvas size is square to match the dimensions of the test digits.  Keep this in mind while drawing.  Digits should take up most of the space on the canvas to ensure an "apples to apples" comparison.
* The Semeion data for each image is simply a 256 (16x16) element bit vector.  1 for a drawn pixel, 0 for a blank one.  This makes a distance metric calculation reasonable. More detail (and therefore, probably accuracy) could be had by capturing the full grayscale data from the image, but would probably make using anything other than a neural network excessively complex.
