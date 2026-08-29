struct Params {
  resolution: vec2f,
  yaw: f32,
  pitch: f32,
  time: f32,
  energy: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

const POINT_COUNT = 75u;
const LOUISIANA = array<vec2f, 75>(
  vec2f(-0.6003, 1.1001),
  vec2f(-1.2000, 1.1027),
  vec2f(-1.1996, 0.5584),
  vec2f(-1.1001, 0.4424),
  vec2f(-1.1053, 0.3422),
  vec2f(-1.0490, 0.3029),
  vec2f(-1.0665, 0.2798),
  vec2f(-1.0163, 0.2285),
  vec2f(-1.0382, 0.1935),
  vec2f(-0.9678, 0.1284),
  vec2f(-0.9566, 0.0478),
  vec2f(-1.0623, -0.2133),
  vec2f(-1.0437, -0.4686),
  vec2f(-1.1477, -0.6007),
  vec2f(-1.0960, -0.7137),
  vec2f(-1.0492, -0.6640),
  vec2f(-0.8270, -0.6448),
  vec2f(-0.5549, -0.7500),
  vec2f(-0.3061, -0.7483),
  vec2f(-0.2146, -0.8379),
  vec2f(-0.1087, -0.8310),
  vec2f(0.1957, -0.9659),
  vec2f(0.1749, -1.0059),
  vec2f(0.2152, -1.0334),
  vec2f(0.4826, -1.0287),
  vec2f(0.8164, -0.9249),
  vec2f(0.8809, -0.9733),
  vec2f(0.8837, -1.1027),
  vec2f(0.9873, -1.0372),
  vec2f(1.0463, -1.0659),
  vec2f(1.1356, -0.9188),
  vec2f(1.0295, -0.8024),
  vec2f(1.1745, -0.6509),
  vec2f(1.2000, -0.5092),
  vec2f(1.1601, -0.4277),
  vec2f(0.8147, -0.3821),
  vec2f(0.7064, -0.1481),
  vec2f(0.7622, 0.0332),
  vec2f(-0.1054, 0.0308),
  vec2f(-0.0704, 0.0598),
  vec2f(-0.1132, 0.1668),
  vec2f(-0.0502, 0.1787),
  vec2f(-0.0778, 0.2489),
  vec2f(-0.0317, 0.2267),
  vec2f(-0.0534, 0.3081),
  vec2f(-0.0001, 0.3370),
  vec2f(-0.0502, 0.3656),
  vec2f(0.0019, 0.3603),
  vec2f(0.0163, 0.4275),
  vec2f(0.0646, 0.4316),
  vec2f(0.0180, 0.4348),
  vec2f(0.0273, 0.4789),
  vec2f(0.0686, 0.4629),
  vec2f(0.1498, 0.5707),
  vec2f(0.1122, 0.6004),
  vec2f(0.1475, 0.5872),
  vec2f(0.1824, 0.6394),
  vec2f(0.1102, 0.6322),
  vec2f(0.1096, 0.6663),
  vec2f(0.1866, 0.6643),
  vec2f(0.2409, 0.7591),
  vec2f(0.1872, 0.7497),
  vec2f(0.1981, 0.7950),
  vec2f(0.1315, 0.8182),
  vec2f(0.1417, 0.8532),
  vec2f(0.1901, 0.8248),
  vec2f(0.1477, 0.8571),
  vec2f(0.1771, 0.9023),
  vec2f(0.1149, 0.8910),
  vec2f(0.1594, 0.9435),
  vec2f(0.1089, 0.9616),
  vec2f(0.1550, 1.0400),
  vec2f(0.1430, 1.0825),
  vec2f(0.1069, 1.0391),
  vec2f(0.1088, 1.0948),
);

const EXTRUSION = 0.12;
const BEVEL = 0.028;

fn rotate_y(p: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
}

fn rotate_x(p: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

fn to_local(p: vec3f) -> vec3f {
  return rotate_x(rotate_y(p, params.yaw), params.pitch);
}

fn louisiana_distance(p: vec2f) -> f32 {
  var distance_squared = dot(p - LOUISIANA[0], p - LOUISIANA[0]);
  var sign = 1.0;
  var previous = POINT_COUNT - 1u;

  for (var current = 0u; current < POINT_COUNT; current++) {
    let edge = LOUISIANA[previous] - LOUISIANA[current];
    let point = p - LOUISIANA[current];
    let nearest = point - edge * clamp(
      dot(point, edge) / max(dot(edge, edge), 0.00001),
      0.0,
      1.0,
    );
    distance_squared = min(distance_squared, dot(nearest, nearest));

    let crosses_up = p.y >= LOUISIANA[current].y;
    let crosses_down = p.y < LOUISIANA[previous].y;
    let crosses_edge = edge.x * point.y > edge.y * point.x;
    if (
      (crosses_up && crosses_down && crosses_edge) ||
      (!crosses_up && !crosses_down && !crosses_edge)
    ) {
      sign = -sign;
    }
    previous = current;
  }

  return sign * sqrt(distance_squared);
}

fn relief_distance(world: vec3f) -> f32 {
  let local = to_local(world);
  let outline = louisiana_distance(vec2f(local.x, -local.z));
  let extrusion = abs(local.y) - EXTRUSION;
  let blend = clamp(0.5 - 0.5 * (extrusion - outline) / BEVEL, 0.0, 1.0);
  return mix(extrusion, outline, blend) + BEVEL * blend * (1.0 - blend);
}

fn normal_at(p: vec3f) -> vec3f {
  let epsilon = 0.0022;
  let x = vec3f(epsilon, 0.0, 0.0);
  let y = vec3f(0.0, epsilon, 0.0);
  let z = vec3f(0.0, 0.0, epsilon);
  return normalize(vec3f(
    relief_distance(p + x) - relief_distance(p - x),
    relief_distance(p + y) - relief_distance(p - y),
    relief_distance(p + z) - relief_distance(p - z),
  ));
}

fn flare_light() -> vec3f {
  let angle = params.time * 0.34 + params.yaw * 2.2;
  let height = 1.95 + sin(params.time * 0.23) * 0.3;
  return vec3f(cos(angle) * 2.1, height, sin(angle) * 2.1);
}

fn hash12(p: vec2f) -> f32 {
  var q = fract(p * vec2f(0.1031, 0.1030));
  q += dot(q, q.yx + 33.33);
  return fract((q.x + q.y) * q.x);
}

fn single_pin_distance(p: vec2f, center: vec2f) -> f32 {
  let q = p - center;
  let head = length(q - vec2f(0.0, 0.024)) - 0.044;
  let tail_progress = clamp((q.y + 0.072) / 0.086, 0.0, 1.0);
  let tail_width = tail_progress * 0.030;
  let tail = max(
    abs(q.x) - tail_width,
    max(-0.072 - q.y, q.y - 0.014),
  );
  return min(head, tail);
}

fn launch_pin_distance(map_point: vec2f) -> f32 {
  let lafayette = single_pin_distance(map_point, vec2f(-0.2796, -0.3807));
  let rapides = single_pin_distance(map_point, vec2f(-0.4731, 0.1963));
  let baton_rouge = single_pin_distance(map_point, vec2f(0.1205, -0.2600));
  return min(lafayette, min(rapides, baton_rouge));
}

fn launch_pin_head_distance(map_point: vec2f) -> f32 {
  let offset = vec2f(0.0, 0.024);
  let lafayette = length(map_point - vec2f(-0.2796, -0.3807) - offset);
  let rapides = length(map_point - vec2f(-0.4731, 0.1963) - offset);
  let baton_rouge = length(map_point - vec2f(0.1205, -0.2600) - offset);
  return min(lafayette, min(rapides, baton_rouge));
}

fn background(ro: vec3f, rd: vec3f, uv: vec2f) -> vec3f {
  var color = vec3f(0.9804, 0.9804, 0.9765);

  if (rd.y < -0.0001) {
    let ground_time = (-0.18 - ro.y) / rd.y;
    if (ground_time > 0.0) {
      let ground_world = ro + rd * ground_time;
      let ground = to_local(ground_world);
      let map_point = vec2f(ground.x, -ground.z);
      let outside = max(louisiana_distance(map_point), 0.0);
      let depth_falloff = exp(-ground_time * 0.12);

      let shadow = exp(-outside * 5.8) * depth_falloff;
      color -= vec3f(0.060, 0.064, 0.078) * shadow;

      let edge_tint = exp(-outside * 14.0);
      let hot = ground_world.xz - flare_light().xz;
      let hotspot = exp(-dot(hot, hot) * 1.9);
      let radiance = edge_tint * (0.18 + hotspot * (0.30 + params.energy * 0.25));
      color = mix(color, vec3f(0.42, 0.55, 1.0), min(radiance, 0.30));
    }
  }

  return color;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let camera = vec3f(0.70, 7.60, 4.20);
  let look_at = vec3f(0.0, -0.02, -0.03);
  let forward = normalize(look_at - camera);
  let right = normalize(cross(forward, vec3f(0.0, 1.0, 0.0)));
  let up = cross(right, forward);

  var screen = uv * 2.0 - 1.0;
  screen.y = -screen.y;
  screen.x *= params.resolution.x / max(params.resolution.y, 1.0);
  let ray_origin = camera + (right * screen.x + up * screen.y) * 1.43;
  let ray = forward;

  var travel = 0.0;
  var hit = false;
  for (var step = 0; step < 88; step++) {
    let distance = relief_distance(ray_origin + ray * travel);
    if (distance < 0.0018) {
      hit = true;
      break;
    }
    travel += max(distance * 0.72, 0.0025);
    if (travel > 14.0) {
      break;
    }
  }

  var color = vec3f(0.0);
  if (hit) {
    let point = ray_origin + ray * travel;
    let local = to_local(point);
    let map_point = vec2f(local.x, -local.z);
    let normal = normal_at(point);
    let view = normalize(camera - point);
    let light = flare_light();
    let to_light = normalize(light - point);
    let half_v = normalize(to_light + view);

    let spec = pow(max(dot(normal, half_v), 0.0), 80.0);
    let top = smoothstep(0.55, 0.95, normal.y);
    let wall = 1.0 - smoothstep(0.12, 0.6, abs(normal.y));
    let diffuse = max(dot(normal, to_light), 0.0);

    let side_color = vec3f(0.035, 0.041, 0.055);
    let top_color = vec3f(0.092, 0.112, 0.174);
    color = mix(side_color, top_color, top);
    color *= 0.68 + diffuse * 0.62;

    let seam = smoothstep(-EXTRUSION - 0.02, EXTRUSION - 0.01, local.y);
    color += vec3f(0.05, 0.12, 0.38) * wall * seam * 0.5;
    color += vec3f(0.55, 0.75, 1.60) * spec * wall * (1.1 + params.energy * 0.7);

    let rim = pow(1.0 - max(dot(normal, view), 0.0), 2.4);
    color += vec3f(0.10, 0.14, 0.28) * rim * (0.72 + params.energy * 0.25);

    let edge = abs(louisiana_distance(map_point));
    let breath = 0.85 + 0.15 * sin(params.time * 1.4);
    let led = exp(-edge * 90.0) * (0.45 + params.energy * 0.30) +
      exp(-edge * 320.0) * 0.85;
    color += vec3f(0.25, 0.45, 1.25) * led * breath * (0.3 + 0.7 * top);

    let pin_distance = launch_pin_distance(map_point);
    let pin_head_distance = launch_pin_head_distance(map_point);
    let pin = 1.0 - smoothstep(-0.002, 0.008, pin_distance);
    let pin_halo = 1.0 - smoothstep(0.030, 0.062, pin_head_distance);
    let pin_core = 1.0 - smoothstep(0.010, 0.020, pin_head_distance);
    color += vec3f(0.08, 0.20, 0.72) * pin_halo * top * (1.0 - pin) *
      (0.8 + params.energy * 0.5);
    color = mix(color, vec3f(0.45, 0.75, 1.90), pin * top);
    color = mix(color, vec3f(1.50, 1.70, 2.10), pin_core * top);
  } else {
    color = background(ray_origin, ray, uv);
  }

  let grain = (hash12(uv * params.resolution + fract(params.time) * 41.7) - 0.5) * 0.005;
  return vec4f(color + grain, 1.0);
}
