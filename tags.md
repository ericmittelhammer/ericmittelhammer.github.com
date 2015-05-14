---
layout: page
title: Tags
permalink: /tags/
---

{% assign sorted_tags = (site.tags | sort:0) %}
{% for tag in sorted_tags %}

<div id="{{ tag[0] }}">

  <!-- for create a heading -->
  <h3> {{ tag[0] }} </h3>


  <!-- create the list of posts -->
  <ul class="tagindex">

    <!-- iterate through all the posts on the site -->
    {% for post in site.posts %}

      <!-- list only those which contain the current tag -->
      {% if post.tags contains tag[0] %}

        <li><a href="{{ post.url | prepend: site.baseurl }}">{{ post.title }}</a></li>

      {% endif %}
    {% endfor %}
  </ul>

</div>
{% endfor %}
