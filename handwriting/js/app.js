var distanceMeasures = {

  hamming: function (arr1, arr2) {
    if (arr1.length != arr2.length) {
      throw ("arrays are different lengths! " + arr1.length + "," + arr2.length);
    } else {
      var sum = 0;
      for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] ^ arr2[i]) {
          sum += 1;
        }
      }
      return sum;
    }

  },

  jaccard: function (arr1, arr2) {
    if (arr1.length != arr2.length) {
      throw ("arrays are different lengths! " + arr1.length + "," + arr2.length);
    } else {
      var bxor = 0;
      var band = 0;
      for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] ^ arr2[i]) {
          bxor += 1;
        } else if (arr1[i] && arr2[i]) {
          band += 1;
        }
      }
      return (bxor / (bxor + band));
    }

  },

  tanimoto: function (arr1, arr2) {
    if (arr1.length != arr2.length) {
      throw ("arrays are different lengths! " + arr1.length + "," + arr2.length);
    } else {
      var bor = 0;
      var band = 0;
      for (var i = 0; i < arr1.length; i++) {
        if (arr1[i] || arr2[i]) {
          bor += 1;
        }
        if (arr1[i] && arr2[i]) {
          band += 1;
        }
      }
      return (-Math.log(band / bor));
    }

  }
};

var net = new brain.NeuralNetwork();

var testData = {};

$.getJSON("./data/semeionNet.json", function(data) {
  //console.log(data);
  net.fromJSON(data);
});

$.getJSON("./data/semeion_testset.json", function(data) {
  //console.log(data);
  testData = data;
});

// resets the canvas to all white
function reset() {
  var ctx = document.getElementById('board').getContext('2d');
  ctx.fillStyle = "rgb(255,255,255)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ['yours', 'hamming', 'jaccard', 'tanimoto'].forEach(function(element, index, array) {
    var sctx = document.getElementById(element).getContext('2d');
    sctx.fillStyle = "rgb(255,255,255)";
    sctx.fillRect(0, 0, sctx.canvas.width, sctx.canvas.height);
  });
  $('#output .result').html('&nbsp;');
};

function findMin(dist) {
  var lowest = dist[0];
  var lowestIndex = 0;
  for (var d = 0; d < dist.length; d++) {
    if (dist[d] < lowest) {
      lowest = dist[d];
      lowestIndex = d;
    }
  }
  return ({
    'min': lowest,
    'idx': lowestIndex
  });
};

function runNet() {
  var origCanvas = document.getElementById('board');
  var origContext = document.getElementById('board').getContext("2d");
  var origImageData = origContext.getImageData(0, 0, origContext.canvas.width, origContext.canvas.height);
  //create another canvas to scale the pixels to 16x16
  var tempCanvas = document.getElementById("yours");

  //tempContext.putImageData(origImageData, 0, 0);
  tempCanvas.width = 16;
  tempCanvas.height = 16;
  var tempContext = tempCanvas.getContext('2d');
  //scale drawn image onto 16x16 sample canvas
  tempContext.drawImage(origCanvas,
    0,
    0,
    origContext.canvas.width,
    origContext.canvas.height,
    0,
    0,
    tempContext.canvas.width,
    tempContext.canvas.height);
  //$(document.body).append(tempCanvas);
  //console.log(tempCanvas);
  //var scaledContext = tempCanvas.getContext('2d');
  //console.log("new dims: w: " + tempContext.canvas.width +" h: " + tempContext.canvas.height);
  var tempImageData = tempContext.getImageData(0, 0, tempContext.canvas.width, tempContext.canvas.height).data;
  //console.log("New # of pixels: " + tempImageData.length);
  var vector = [];
  for (var i = 0; i < tempImageData.length; i += 4) {
    var r = tempImageData[i + 1];
    var g = tempImageData[i + 2];
    var b = tempImageData[i + 3];
    var p = ((r + g + b) < 765) ? 1 : 0;
    vector.push(p)
  }

  //calculate distances
  var distances = {
    'hamming': [],
    'jaccard': [],
    'tanimoto': []
  };

  // for each digit in the test set, calulate its distance from the scaled image by each metric
  for (var ts = 0; ts < testData.length; ts++) {
    distances.hamming.push(distanceMeasures.hamming(vector, testData[ts].input));
    distances.jaccard.push(distanceMeasures.jaccard(vector, testData[ts].input));
    distances.tanimoto.push(distanceMeasures.tanimoto(vector, testData[ts].input));
  }


  // for each distance metric, find the closest image in the test set, and draw it onto the 16x16 canvas for that metric
  ['hamming', 'jaccard', 'tanimoto'].forEach(function(metricName, index, array) {
    // get the digit from the test set with the corresponding index to the closest match
    var digit = testData[findMin(distances[metricName]).idx];
    var sctx = document.getElementById(metricName).getContext('2d');
    sctx.fillStyle = "rgb(0,0,0)";
    for (var p = 0; p < 256; p++) {
      if (digit.input[p] == 1) {
        //map the index of the pixel onto a 16x16 grid
        sctx.fillRect(p % 16, Math.floor(p / 16), 1, 1);
      }
    }
  });

  // run the scaled image through the neural net and find the winning output neuron
  var output = net.run(vector);
  console.log("input", vector);
  console.log("output", output);
  var winner = output.indexOf(Math.max.apply(null, output));
  // index of the winning neuron is the matched digit.  display it
  $("#output .result").html(winner);
};  //runNet
