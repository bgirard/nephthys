'use strict';

(function(exports) {
  var _id = 0;
  var Thread = function(config) {
    this.config = config;
    this.init();
    Thread[this.instanceID] = this;
  };

  Thread.prototype = new EventEmitter();

  Thread.prototype.containerElement = document.getElementById('timeline');

  Thread.prototype.CLASS_NAME = 'thread-';

  Thread.prototype.template = function() {
    this.instanceID = this.CLASS_NAME + _id;
    _id++;
    return '<div class="thread" id="' + this.instanceID + '"></div>';
  };

  Thread.prototype.placeTasks = function() {
    function _pickbag(bags) {
      var min = 0;
      for (var i = 0; i < bags.length; i++) {
        if (bags[min] > bags[i]) {
          min = i;
        }
      }
      return min;
    }

    var thread_first_y = 0;
    var tasks = this.config.tasks;
    var bags = [0];
    tasks.sort(function(t1, t2) { return t1.dispatch - t2.dispatch; });
    tasks.forEach(function(task) {
      var bag_i = _pickbag(bags);
      if (bags[bag_i] > task.dispatch) {
        bag_i = bags.length;
        bags.push(0);
      }
      task.place_y = bag_i;
      bags[bag_i] = task.end;
    });
    this.bags = bags;
  };


  Thread.prototype.init = function() {
    this.containerElement.insertAdjacentHTML('beforeend', this.template());
    this.element = $('#' + this.instanceID);
    this.placeTasks();
    this.WIDTH = $('#timeline').width();
    if (this.bags) {
      this.HEIGHT = (this.bags.length + 1) * (this._intervalH + this._taskHeight);
    } else {
      this.HEIGHT = 500;
    }
    this._canvas =
      Raphael(document.getElementById(this.instanceID),
        this.WIDTH, this.HEIGHT);
    this.render();
  };

  Thread.prototype.resize = function(w, h) {
    this.WIDTH = w;
    this.HEIGHT = h;

    this._canvas.setSize(this.WIDTH, this.HEIGHT);
  };

  Thread.prototype.open = function() {
    this.animationState = 'opening';
    // ...
    this.animationState = 'opened';
  };

  Thread.prototype.close = function() {
    this.animationState = 'closing';
    // ...
    this.animationState = 'closed';
  };

  Thread.prototype.update = function() {
  };

  Thread.prototype.render = function(task) {
    if (this._rendered || !this.config.tasks) {
      return;
    }

    this._rendered = true;

    var self = this;
    this.render_thread();
    var tasks = this.config.tasks;
    var ColorManager = window.app.colorManager;
    this.config.tasks.forEach(function(task) {
      (function(t) {
        setTimeout(function() {
          self.render_task(t, ColorManager.getColor(task.sourceEventId));
        });
      }(task));
    }, this);

    this.element.mousemove(function(evt) {
      var x = evt.pageX;
      var y = evt.pageY;
      var ele = this._canvas.getElementByPoint(x, y);
      if (ele) {
        console.log(ele);
      }
    }.bind(this));

    this.element.dblclick(function(evt) {
      var x = evt.offsetX;
      var y = evt.offsetY;
      window.app.broadcaster.emit('zoom-in', x, y);
    }.bind(this));

    window.app.broadcaster.on('zoom-in', function(x, y) {
      console.log(x, y, this);
      this._canvas.setViewBox(x, y, this.WIDTH, this.HEIGHT, false);
    }.bind(this));
  };

  Thread.prototype._offsetX = 200;
  Thread.prototype._offsetY = 0;
  Thread.prototype._taskHeight = 10;
  Thread.prototype._intervalH = 15;
  Thread.prototype._taskMinWidth = 1;

  Thread.prototype.render_thread = function() {
    var threadRect = this._canvas.rect(3, 5, 120, 20).attr('fill', 'white');
    var thread = this._canvas.text(15, 15, 'Thread: ' + this.config.tasks[0].threadId)
                              .attr('text-anchor', 'start')
                              .attr('color', '#ffffff').attr('font-size', 15);
  };

  Thread.prototype.render_task = function(task, sourceEventColor) {
    // No dispatch time!
    if (task.dispatch === 0 && task.start !== 0) {
      task.dispatch = task.start;
    }
    var lx = this.WIDTH * (task.dispatch - this.config.start) / this.config.interval + this._offsetX;
    var ex = this.WIDTH * (task.start - this.config.start) / this.config.interval + this._offsetX;
    var y = task.place_y * (this._taskHeight + this._intervalH) + this._offsetY;
    var lw = (this.WIDTH - this._offsetX) * (task.start - task.dispatch) / this.config.interval;
    var ew = (this.WIDTH - this._offsetX) * (task.end - task.start) / this.config.interval;
    var h = this._taskHeight;
    var c = sourceEventColor;

    /** Render latency **/
    var width = (lw + ew) > this._taskMinWidth ? (lw + ew) : this._taskMinWidth;
    var latency = this._canvas.rect(lx, y, width, h);
    latency.attr('fill', c);
    latency.attr('opacity', 0.5);
    latency.attr('stroke', 'black');

    /** Render execution **/
    var execution = this._canvas.rect(ex, y, ew, h);
    execution.attr('fill', c);
    execution.attr('stroke', 'black');

    /** Render label **/
    var label;

    if (task.parentTaskId === task.sourceEventId) {
      label = this._canvas.text(lx + 5, y + this._taskHeight / 2, (task.sourceEventId)).attr('text-anchor', 'start').attr('color', '#ffffff').attr('font-size', 15).attr(
        'fill', sourceEventColor);
      label.attr('x', label.getBBox().x - label.getBBox().width - 10);
      label.hide(); // hide by default
    }

    //var set = this._canvas.set();
    var show = function(){
      if (this.tooltipText) {
        this.tooltipText.remove();
      }
      this.tooltipText = this._canvas.text(this.WIDTH - 190, 40,
        'Dispatch: ' + task.dispatch + ' ' + 'Latency: ' + (task.start - task.dispatch) + '\n' +
        'Start: ' + task.start + ' ' + 'Execution: ' + (task.end - task.start) + '\n' +
        'End: ' + task.end).attr('text-anchor', 'start');
    }
    //latency.hover(show, function() { this.tooltipText.remove(); }, this, this);
    //execution.hover(show, function() { this.tooltipText.remove(); }, this, this);
  };

  exports.Thread = Thread;
}(this));