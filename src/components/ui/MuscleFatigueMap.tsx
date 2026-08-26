'use client';

import React from 'react';

export type MuscleMapView = 'front' | 'back';
export type MuscleMapTheme = 'light' | 'dark';

export type MuscleFatigue = {
  id: string;
  fatigue: number;
  lastWorkedAt?: string;
};

export type MuscleFatigueMapProps = {
  view: MuscleMapView;
  theme: MuscleMapTheme;
  muscles: MuscleFatigue[];
  selectedId?: string | null;
  onSelect: (id: string, trigger?: SVGPathElement) => void;
  onHover?: (id: string | null) => void;
  onToggleView?: () => void;
  className?: string;
};

type Region = {
  id: string;
  d: string;
  label: string;
  decorative?: boolean;
  lightColor: string;
};

const GRAY = '#6B7280';
const RED = '#EF4444';
const BLUE = '#60A5FA';
const GREEN = '#10B981';
const ORANGE = '#F59E0B';

export const FRONT_MUSCLE_IDS = [
  'head', 'neck', 'trap_l', 'trap_r', 'delt_l', 'delt_r', 'pec_l', 'pec_r',
  'biceps_l', 'biceps_r', 'forearm_l', 'forearm_r', 'hand_l', 'hand_r',
  'abs_upper_l', 'abs_upper_r', 'abs_mid_l', 'abs_mid_r', 'abs_lower_l', 'abs_lower_r',
  'oblique_l', 'oblique_r', 'quad_outer_l', 'quad_mid_l', 'quad_inner_l',
  'quad_outer_r', 'quad_mid_r', 'quad_inner_r', 'shin_outer_l', 'shin_inner_l',
  'shin_outer_r', 'shin_inner_r', 'foot_l', 'foot_r',
] as const;

export const BACK_MUSCLE_IDS = [
  'head_back', 'neck_back', 'trap_back_l', 'trap_back_r', 'rear_delt_l', 'rear_delt_r',
  'lat_l', 'lat_r', 'triceps_l', 'triceps_r', 'lower_back_l', 'lower_back_r',
  'glute_l', 'glute_r', 'hamstring_outer_l', 'hamstring_inner_l',
  'hamstring_outer_r', 'hamstring_inner_r', 'calf_l', 'calf_r', 'foot_back_l',
  'foot_back_r', 'forearm_back_l', 'forearm_back_r', 'hand_back_l', 'hand_back_r',
] as const;

export type FrontMuscleId = typeof FRONT_MUSCLE_IDS[number];
export type BackMuscleId = typeof BACK_MUSCLE_IDS[number];
export type MuscleRegionId = FrontMuscleId | BackMuscleId;

const FRONT_SILHOUETTE = 'M120 12 C104 12 96 24 96 42 C96 55 101 66 108 72 L108 82 C101 88 93 91 84 95 L69 99 C57 101 50 109 48 122 L45 151 C43 162 39 173 34 183 L18 215 C12 225 8 232 3 238 C0 242 1 247 6 249 C11 251 17 249 22 245 L27 240 C29 236 28 232 25 229 C33 219 45 207 51 196 L57 183 C62 174 68 165 72 151 C76 145 80 145 84 146 L84 226 C75 239 71 257 70 281 L70 346 C71 362 75 376 78 385 C73 402 71 424 72 449 C73 469 77 486 82 498 L80 507 C78 514 70 519 63 523 C59 526 62 528 69 529 C81 530 95 528 105 523 L106 514 C108 498 108 477 109 454 L111 389 C113 371 116 350 120 330 C124 350 127 371 129 389 L131 454 C132 477 132 498 134 514 L135 523 C145 528 159 530 171 529 C178 528 181 526 177 523 C170 519 162 514 160 507 L158 498 C163 486 167 469 168 449 C169 424 167 402 162 385 C165 376 169 362 170 346 L170 281 C169 257 165 239 156 226 L156 146 C160 145 164 145 168 151 C172 165 178 174 183 183 L189 196 C195 207 207 219 215 229 C212 232 211 236 213 240 L218 245 C223 249 229 251 234 249 C239 247 240 242 237 238 C232 232 228 225 222 215 L206 183 C201 173 197 162 195 151 L192 122 C190 109 183 101 171 99 L156 95 C147 91 139 88 132 82 L132 72 C139 66 144 55 144 42 C144 24 136 12 120 12 Z';
const BACK_SILHOUETTE = FRONT_SILHOUETTE;

export const FRONT_REGIONS: readonly Region[] = [
  { id: 'head', label: 'Đầu', decorative: true, lightColor: GRAY, d: 'M120 12 C104 12 96 24 96 42 C96 54 100 64 106 70 C107 82 112 90 120 95 C128 90 133 82 134 70 C140 64 144 54 144 42 C144 24 136 12 120 12 Z' },
  { id: 'neck', label: 'Cổ', lightColor: GRAY, d: 'M108 72 C110 84 108 91 104 97 L118 108 L120 101 L122 108 L136 97 C132 91 130 84 132 72 C128 85 124 91 120 94 C116 91 112 85 108 72 Z' },
  { id: 'trap_l', label: 'Cầu vai trái', lightColor: GRAY, d: 'M103 87 C96 92 88 96 80 100 C92 101 103 105 115 113 L118 105 Z' },
  { id: 'trap_r', label: 'Cầu vai phải', lightColor: GRAY, d: 'M137 87 C144 92 152 96 160 100 C148 101 137 105 125 113 L122 105 Z' },
  { id: 'delt_l', label: 'Vai trái', lightColor: RED, d: 'M80 99 C73 96 64 98 58 104 C53 109 51 117 52 125 C52 132 54 137 57 140 C61 136 65 132 71 130 C76 128 81 128 84 124 C88 118 89 109 86 103 C84 101 82 100 80 99 Z' },
  { id: 'delt_r', label: 'Vai phải', lightColor: RED, d: 'M160 99 C167 96 176 98 182 104 C187 109 189 117 188 125 C188 132 186 137 183 140 C179 136 175 132 169 130 C164 128 159 128 156 124 C152 118 151 109 154 103 C156 101 158 100 160 99 Z' },
  { id: 'pec_l', label: 'Ngực trái', lightColor: RED, d: 'M92 101 C102 99 112 101 119 104 L119 139 C108 138 98 140 88 143 C80 144 74 139 70 133 C68 130 69 127 72 125 C76 121 78 114 81 108 C84 103 88 101 92 101 Z M76 142 C82 141 86 145 87 150 C88 159 85 169 82 176 C79 172 77 167 76 161 C75 153 74 147 76 142 Z' },
  { id: 'pec_r', label: 'Ngực phải', lightColor: RED, d: 'M148 101 C138 99 128 101 121 104 L121 139 C132 138 142 140 152 143 C160 144 166 139 170 133 C172 130 171 127 168 125 C164 121 162 114 159 108 C156 103 152 101 148 101 Z M164 142 C158 141 154 145 153 150 C152 159 155 169 158 176 C161 172 163 167 164 161 C165 153 166 147 164 142 Z' },
  { id: 'biceps_l', label: 'Tay trước trái', lightColor: GREEN, d: 'M57 136 C50 143 47 153 47 164 C47 172 50 179 54 183 C61 178 66 169 69 158 C72 148 70 140 66 136 Z' },
  { id: 'biceps_r', label: 'Tay trước phải', lightColor: GREEN, d: 'M183 136 C190 143 193 153 193 164 C193 172 190 179 186 183 C179 178 174 169 171 158 C168 148 170 140 174 136 Z' },
  { id: 'forearm_l', label: 'Cẳng tay trái', lightColor: BLUE, d: 'M49 177 C43 184 38 193 33 204 L19 228 C16 234 17 239 21 242 C27 238 33 231 38 222 L52 196 C56 187 55 181 51 177 Z M34 181 C30 190 25 201 20 212 L15 224 C13 229 13 233 16 235 C21 229 25 222 29 214 L42 187 C40 183 38 181 34 181 Z' },
  { id: 'forearm_r', label: 'Cẳng tay phải', lightColor: BLUE, d: 'M191 177 C197 184 202 193 207 204 L221 228 C224 234 223 239 219 242 C213 238 207 231 202 222 L188 196 C184 187 185 181 189 177 Z M206 181 C210 190 215 201 220 212 L225 224 C227 229 227 233 224 235 C219 229 215 222 211 214 L198 187 C200 183 202 181 206 181 Z' },
  { id: 'hand_l', label: 'Bàn tay trái', decorative: true, lightColor: GRAY, d: 'M20 226 C15 229 10 234 5 240 C2 243 1 246 3 248 C7 251 13 250 18 247 L25 241 C28 238 28 234 25 231 C24 229 22 227 20 226 Z' },
  { id: 'hand_r', label: 'Bàn tay phải', decorative: true, lightColor: GRAY, d: 'M220 226 C225 229 230 234 235 240 C238 243 239 246 237 248 C233 251 227 250 222 247 L215 241 C212 238 212 234 215 231 C216 229 218 227 220 226 Z' },
  { id: 'abs_upper_l', label: 'Bụng trên trái', lightColor: ORANGE, d: 'M104 151 C108 148 112 148 117 150 L117 172 C112 174 107 173 103 170 C101 163 101 156 104 151 Z' },
  { id: 'abs_upper_r', label: 'Bụng trên phải', lightColor: ORANGE, d: 'M136 151 C132 148 128 148 123 150 L123 172 C128 174 133 173 137 170 C139 163 139 156 136 151 Z' },
  { id: 'abs_mid_l', label: 'Bụng giữa trái', lightColor: ORANGE, d: 'M103 177 C108 174 112 175 117 177 L117 197 C112 200 107 199 103 196 C100 190 100 183 103 177 Z' },
  { id: 'abs_mid_r', label: 'Bụng giữa phải', lightColor: ORANGE, d: 'M137 177 C132 174 128 175 123 177 L123 197 C128 200 133 199 137 196 C140 190 140 183 137 177 Z' },
  { id: 'abs_lower_l', label: 'Bụng dưới trái', lightColor: ORANGE, d: 'M105 203 C109 200 113 201 117 203 L117 229 C113 230 109 228 106 224 C103 217 102 209 105 203 Z' },
  { id: 'abs_lower_r', label: 'Bụng dưới phải', lightColor: ORANGE, d: 'M135 203 C131 200 127 201 123 203 L123 229 C127 230 131 228 134 224 C137 217 138 209 135 203 Z' },
  { id: 'oblique_l', label: 'Liên sườn trái', lightColor: ORANGE, d: 'M91 148 C96 151 99 156 101 162 C97 181 98 207 104 229 C99 235 94 239 89 242 C84 226 81 208 82 188 C82 170 85 157 91 148 Z' },
  { id: 'oblique_r', label: 'Liên sườn phải', lightColor: ORANGE, d: 'M149 148 C144 151 141 156 139 162 C143 181 142 207 136 229 C141 235 146 239 151 242 C156 226 159 208 158 188 C158 170 155 157 149 148 Z' },
  { id: 'quad_outer_l', label: 'Đùi trước ngoài trái', lightColor: GREEN, d: 'M78 273 C73 285 71 303 72 321 C73 334 76 343 80 347 C84 339 86 327 86 313 C87 296 84 281 78 273 Z' },
  { id: 'quad_mid_l', label: 'Đùi trước giữa trái', lightColor: GREEN, d: 'M91 238 C85 249 82 267 82 287 C82 307 86 322 92 329 C98 322 101 307 101 288 C101 267 98 248 91 238 Z' },
  { id: 'quad_inner_l', label: 'Đùi trước trong trái', lightColor: GREEN, d: 'M107 256 C104 269 104 288 106 304 C108 310 111 309 113 304 C114 287 113 269 107 256 Z M98 301 C92 311 90 325 92 339 C94 350 99 357 104 358 C108 350 109 338 107 325 C106 314 103 305 98 301 Z' },
  { id: 'quad_outer_r', label: 'Đùi trước ngoài phải', lightColor: GREEN, d: 'M162 273 C167 285 169 303 168 321 C167 334 164 343 160 347 C156 339 154 327 154 313 C153 296 156 281 162 273 Z' },
  { id: 'quad_mid_r', label: 'Đùi trước giữa phải', lightColor: GREEN, d: 'M149 238 C155 249 158 267 158 287 C158 307 154 322 148 329 C142 322 139 307 139 288 C139 267 142 248 149 238 Z' },
  { id: 'quad_inner_r', label: 'Đùi trước trong phải', lightColor: GREEN, d: 'M133 256 C136 269 136 288 134 304 C132 310 129 309 127 304 C126 287 127 269 133 256 Z M142 301 C148 311 150 325 148 339 C146 350 141 357 136 358 C132 350 131 338 133 325 C134 314 137 305 142 301 Z' },
  { id: 'shin_outer_l', label: 'Cẳng chân trước ngoài trái', lightColor: GREEN, d: 'M80 386 C74 399 72 417 73 437 C74 457 78 474 84 482 C88 468 90 449 89 430 C88 411 85 395 80 386 Z' },
  { id: 'shin_inner_l', label: 'Cẳng chân trước trong trái', lightColor: GREEN, d: 'M99 392 C96 403 96 417 98 432 C99 439 101 442 103 439 C105 425 104 407 99 392 Z' },
  { id: 'shin_outer_r', label: 'Cẳng chân trước ngoài phải', lightColor: GREEN, d: 'M160 386 C166 399 168 417 167 437 C166 457 162 474 156 482 C152 468 150 449 151 430 C152 411 155 395 160 386 Z' },
  { id: 'shin_inner_r', label: 'Cẳng chân trước trong phải', lightColor: GREEN, d: 'M141 392 C144 403 144 417 142 432 C141 439 139 442 137 439 C135 425 136 407 141 392 Z' },
  { id: 'foot_l', label: 'Bàn chân trái', decorative: true, lightColor: GRAY, d: 'M82 486 C83 499 82 508 78 515 L63 523 C59 526 62 528 69 528 C81 529 94 527 104 523 L105 514 C96 511 88 501 82 486 Z' },
  { id: 'foot_r', label: 'Bàn chân phải', decorative: true, lightColor: GRAY, d: 'M158 486 C157 499 158 508 162 515 L177 523 C181 526 178 528 171 528 C159 529 146 527 136 523 L135 514 C144 511 152 501 158 486 Z' },
] as const;

export const BACK_REGIONS: readonly Region[] = [
  { id: 'head_back', label: 'Sau đầu', decorative: true, lightColor: GRAY, d: 'M120 12 C104 12 96 24 96 42 C96 55 101 67 108 73 L108 84 C112 90 116 93 120 95 C124 93 128 90 132 84 L132 73 C139 67 144 55 144 42 C144 24 136 12 120 12 Z' },
  { id: 'neck_back', label: 'Sau cổ', lightColor: GRAY, d: 'M108 70 C110 83 106 91 99 98 L116 118 L117 92 C113 87 111 79 108 70 Z M132 70 C130 83 134 91 141 98 L124 118 L123 92 C127 87 129 79 132 70 Z' },
  { id: 'trap_back_l', label: 'Cầu vai sau trái', lightColor: GRAY, d: 'M110 66 C108 79 102 89 92 96 L80 102 C91 108 99 117 105 128 C111 139 114 150 117 159 L117 105 C114 93 112 79 110 66 Z' },
  { id: 'trap_back_r', label: 'Cầu vai sau phải', lightColor: GRAY, d: 'M130 66 C132 79 138 89 148 96 L160 102 C149 108 141 117 135 128 C129 139 126 150 123 159 L123 105 C126 93 128 79 130 66 Z' },
  { id: 'rear_delt_l', label: 'Vai sau trái', lightColor: RED, d: 'M80 99 C72 96 63 98 57 105 C52 111 52 121 54 130 C55 136 57 140 60 142 C66 137 73 133 82 131 C87 127 90 120 90 112 C90 107 87 102 80 99 Z' },
  { id: 'rear_delt_r', label: 'Vai sau phải', lightColor: RED, d: 'M160 99 C168 96 177 98 183 105 C188 111 188 121 186 130 C185 136 183 140 180 142 C174 137 167 133 158 131 C153 127 150 120 150 112 C150 107 153 102 160 99 Z' },
  { id: 'lat_l', label: 'Xô trái', lightColor: GREEN, d: 'M88 131 C98 130 107 137 114 149 L114 178 C109 182 105 188 100 193 C97 196 94 195 91 192 C84 185 79 176 77 166 C75 153 77 142 82 135 C84 133 86 132 88 131 Z M76 119 C83 119 89 121 95 126 L91 136 C84 135 78 132 73 128 Z' },
  { id: 'lat_r', label: 'Xô phải', lightColor: GREEN, d: 'M152 131 C142 130 133 137 126 149 L126 178 C131 182 135 188 140 193 C143 196 146 195 149 192 C156 185 161 176 163 166 C165 153 163 142 158 135 C156 133 154 132 152 131 Z M164 119 C157 119 151 121 145 126 L149 136 C156 135 162 132 167 128 Z' },
  { id: 'triceps_l', label: 'Tay sau trái', lightColor: GREEN, d: 'M59 132 C53 140 51 151 52 163 C53 171 56 178 60 181 C65 174 68 164 69 153 C70 143 67 136 64 132 Z M49 140 C45 148 43 158 44 168 C45 174 48 179 51 181 C54 173 56 163 56 152 C55 146 53 142 49 140 Z' },
  { id: 'triceps_r', label: 'Tay sau phải', lightColor: GREEN, d: 'M181 132 C187 140 189 151 188 163 C187 171 184 178 180 181 C175 174 172 164 171 153 C170 143 173 136 176 132 Z M191 140 C195 148 197 158 196 168 C195 174 192 179 189 181 C186 173 184 163 184 152 C185 146 187 142 191 140 Z' },
  { id: 'lower_back_l', label: 'Lưng dưới trái', lightColor: GRAY, d: 'M99 183 L115 198 L115 226 L95 220 C93 207 94 193 99 183 Z' },
  { id: 'lower_back_r', label: 'Lưng dưới phải', lightColor: GRAY, d: 'M141 183 L125 198 L125 226 L145 220 C147 207 146 193 141 183 Z' },
  { id: 'glute_l', label: 'Mông trái', lightColor: GREEN, d: 'M86 225 C97 222 108 226 115 235 L115 270 C107 276 97 279 88 276 C81 272 79 262 80 247 C80 237 83 229 86 225 Z' },
  { id: 'glute_r', label: 'Mông phải', lightColor: GREEN, d: 'M154 225 C143 222 132 226 125 235 L125 270 C133 276 143 279 152 276 C159 272 161 262 160 247 C160 237 157 229 154 225 Z' },
  { id: 'hamstring_outer_l', label: 'Đùi sau ngoài trái', lightColor: GREEN, d: 'M78 277 C73 291 72 310 74 330 C76 347 80 358 85 363 C89 352 91 337 90 320 C89 301 85 285 78 277 Z' },
  { id: 'hamstring_inner_l', label: 'Đùi sau trong trái', lightColor: GREEN, d: 'M94 281 C101 279 108 277 113 274 L112 322 C111 344 107 366 102 378 C97 366 95 350 96 330 C97 310 97 293 94 281 Z' },
  { id: 'hamstring_outer_r', label: 'Đùi sau ngoài phải', lightColor: GREEN, d: 'M162 277 C167 291 168 310 166 330 C164 347 160 358 155 363 C151 352 149 337 150 320 C151 301 155 285 162 277 Z' },
  { id: 'hamstring_inner_r', label: 'Đùi sau trong phải', lightColor: GREEN, d: 'M146 281 C139 279 132 277 127 274 L128 322 C129 344 133 366 138 378 C143 366 145 350 144 330 C143 310 143 293 146 281 Z' },
  { id: 'calf_l', label: 'Bắp chuối trái', lightColor: GREEN, d: 'M80 364 C74 377 72 394 74 414 C75 429 79 441 84 445 C88 437 90 422 89 405 C88 386 85 372 80 364 Z M96 366 C102 380 105 396 104 414 C103 432 99 444 95 449 C91 439 89 423 90 405 C91 388 92 375 96 366 Z' },
  { id: 'calf_r', label: 'Bắp chuối phải', lightColor: GREEN, d: 'M160 364 C166 377 168 394 166 414 C165 429 161 441 156 445 C152 437 150 422 151 405 C152 386 155 372 160 364 Z M144 366 C138 380 135 396 136 414 C137 432 141 444 145 449 C149 439 151 423 150 405 C149 388 148 375 144 366 Z' },
  { id: 'foot_back_l', label: 'Gót chân trái', decorative: true, lightColor: GRAY, d: 'M82 486 C83 499 82 508 78 515 L63 523 C59 526 62 528 69 528 C81 529 94 527 104 523 L105 514 C96 511 88 501 82 486 Z' },
  { id: 'foot_back_r', label: 'Gót chân phải', decorative: true, lightColor: GRAY, d: 'M158 486 C157 499 158 508 162 515 L177 523 C181 526 178 528 171 528 C159 529 146 527 136 523 L135 514 C144 511 152 501 158 486 Z' },
  { id: 'forearm_back_l', label: 'Cẳng tay sau trái', lightColor: BLUE, d: 'M49 176 C43 184 38 193 33 204 L19 228 C16 234 17 239 21 242 C27 238 33 231 38 222 L52 196 C56 187 55 181 51 176 Z M34 180 C30 190 25 201 20 212 L15 224 C13 229 13 233 16 235 C21 229 25 222 29 214 L42 187 C40 183 38 181 34 180 Z' },
  { id: 'forearm_back_r', label: 'Cẳng tay sau phải', lightColor: BLUE, d: 'M191 176 C197 184 202 193 207 204 L221 228 C224 234 223 239 219 242 C213 238 207 231 202 222 L188 196 C184 187 185 181 189 176 Z M206 180 C210 190 215 201 220 212 L225 224 C227 229 227 233 224 235 C219 229 215 222 211 214 L198 187 C200 183 202 181 206 180 Z' },
  { id: 'hand_back_l', label: 'Mu bàn tay trái', decorative: true, lightColor: GRAY, d: 'M20 226 C15 229 10 234 5 240 C2 243 1 246 3 248 C7 251 13 250 18 247 L25 241 C28 238 28 234 25 231 C24 229 22 227 20 226 Z' },
  { id: 'hand_back_r', label: 'Mu bàn tay phải', decorative: true, lightColor: GRAY, d: 'M220 226 C225 229 230 234 235 240 C238 243 239 246 237 248 C233 251 227 250 222 247 L215 241 C212 238 212 234 215 231 C216 229 218 227 220 226 Z' },
] as const;

const BASE_DARK = '#555566';

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseHex(hex: string) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function interpolateHex(start: string, end: string, progress: number) {
  const a = parseHex(start);
  const b = parseHex(end);
  return `#${a.map((channel, index) => Math.round(channel + (b[index] - channel) * clamp(progress)).toString(16).padStart(2, '0')).join('')}`;
}

export function fatigueColor(fatigue: number): string {
  const value = clamp(fatigue);
  if (value <= 0.25) return interpolateHex(BASE_DARK, '#75677C', value / 0.25);
  if (value <= 0.7) return interpolateHex('#75677C', '#B6607E', (value - 0.25) / 0.45);
  return interpolateHex('#B6607E', '#EF3F65', (value - 0.7) / 0.3);
}

export function readinessToFatigue(readiness: number | null | undefined): number {
  if (readiness === null || readiness === undefined) return 0;
  return clamp(1 - readiness / 100);
}

const DECORATIVE_IDS = new Set<MuscleRegionId>([
  'head', 'head_back', 'hand_l', 'hand_r', 'hand_back_l', 'hand_back_r',
  'foot_l', 'foot_r', 'foot_back_l', 'foot_back_r',
]);

export function MuscleFatigueMap({
  view,
  theme,
  muscles,
  selectedId = null,
  onSelect,
  onHover,
  className = '',
}: MuscleFatigueMapProps) {
  const fatigueById = React.useMemo(
    () => new Map(muscles.map((muscle) => [muscle.id, clamp(muscle.fatigue)])),
    [muscles],
  );
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;

  return (
    <svg
      viewBox="0 0 240 560"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      role="group"
      aria-label={`Bản đồ nhóm cơ, ${view === 'front' ? 'mặt trước' : 'mặt sau'}`}
      className={`block h-auto w-full select-none ${className}`}
      style={{ backgroundColor: theme === 'dark' ? '#1A1A24' : '#E8EEF4' }}
    >
      <g fillRule="evenodd" stroke={theme === 'dark' ? '#202331' : '#1f2937'} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
        <path
          d={view === 'front' ? FRONT_SILHOUETTE : BACK_SILHOUETTE}
          fill={theme === 'dark' ? '#484759' : GRAY}
          aria-hidden="true"
          pointerEvents="none"
          vectorEffect="non-scaling-stroke"
        />
        {regions.map((region) => {
          const decorative = region.decorative || DECORATIVE_IDS.has(region.id as MuscleRegionId);
          const fatigue = fatigueById.get(region.id) ?? 0;
          const selected = !decorative && selectedId === region.id;
          const fill = decorative
            ? (theme === 'dark' ? '#4A4A5D' : GRAY)
            : theme === 'dark'
              ? fatigueColor(fatigue)
              : region.lightColor;
          const accessibility = decorative ? {} : {
            role: 'button',
            tabIndex: 0,
            'aria-label': `${region.label}, mức mệt ${Math.round(fatigue * 100)} phần trăm`,
            'aria-pressed': selected,
          };

          return (
            <path
              key={region.id}
              id={region.id}
              data-muscle={region.id}
              d={region.d}
              fill={fill}
              fillRule="evenodd"
              pointerEvents={decorative ? 'none' : 'auto'}
              stroke={selected ? '#F5F5F5' : theme === 'dark' ? '#202331' : '#1f2937'}
              strokeWidth={selected ? 2 : 1.35}
              vectorEffect="non-scaling-stroke"
              className={decorative ? 'transition-[fill,stroke] duration-150' : 'cursor-pointer transition-[fill,stroke,filter] duration-150 hover:brightness-[1.12] focus-visible:outline-none'}
              onClick={decorative ? undefined : (event) => onSelect(region.id, event.currentTarget)}
              onMouseEnter={decorative ? undefined : () => onHover?.(region.id)}
              onMouseLeave={decorative ? undefined : () => onHover?.(null)}
              onKeyDown={decorative ? undefined : (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onSelect(region.id, event.currentTarget);
              }}
              {...accessibility}
            />
          );
        })}
      </g>
    </svg>
  );
}

export default MuscleFatigueMap;
