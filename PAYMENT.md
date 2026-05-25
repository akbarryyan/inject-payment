# QRIS Payment SDK

SDK JavaScript/TypeScript ringan untuk integrasi pembayaran QRIS melalui gateway Poppay. Memungkinkan Anda membuka jendela pembayaran (popup) dengan minimal konfigurasi dan mendukung data dinamis.

## ✨ Fitur

* 🚀 **Ringan**: Tanpa dependensi berat.
* 📦 **Multi-Format**: Mendukung ESM (NPM) dan UMD (CDN).
* 🛠 **Dinamis**: Data transaksi bisa diinput dari sisi client.
* 🔗 **Auto-Inquiry**: Sudah termasuk logika pengecekan status pembayaran otomatis.

---

## ⚙️ Instalasi

### Menggunakan NPM (Next.js, React, Vue, Laravel Vite)

```bash
npm i @poppackage/qris-payment-sdk

```

### Menggunakan CDN (Laravel Blade, HTML Statis)

Tambahkan script ini sebelum penutup tag `</body>`:

```html
<script src="https://unpkg.com/@poppackage/qris-payment-sdk/dist/qris-sdk.umd.js"></script>

```

---

## 🚀 Cara Penggunaan

**Parameter wajib:** selain `amount`, Anda harus mengisi **`invoice`** (string unik per transaksi/order dari sistem Anda). Nilai ini dipakai agar gateway dan alur `onSuccess` di backend dapat mengaitkan pembayaran QRIS dengan baris order yang benar—jangan memakai placeholder statis di production.

### 1. Penggunaan di Framework Modern (ESM)

Jika Anda menggunakan bundler seperti Vite atau Webpack:

```typescript
import { QrisSDK } from '@poppackage/qris-payment-sdk';

const qris = new QrisSDK({
  amount: 50000,
  invoice: 'INV-1001',
  resultContainerId: 'payment-result',
  onSuccess: (data) => {
    console.log('Payment success:', data);
    // Handle success, misal redirect atau tampilkan notifikasi
  },
  onFailed: (status) => {
    console.log('Payment failed:', status);
    // Handle failure
  }
});

// Panggil fungsi ini pada event click tombol
const handlePay = () => {
  qris.openPayment();
};

```

### 2. Penggunaan di Laravel / Vanilla JS (UMD)

Setelah memanggil script dari CDN, class `QrisSDK` akan tersedia di objek `window`.

```html
<div id="payment-result"></div>
<button id="pay-button">Bayar Sekarang</button>

<script>
  const btn = document.getElementById('pay-button');
  
  const qris = new QrisSDK({
    amount: 15000,
    invoice: 'INV-1002',
    resultContainerId: 'payment-result',
    onSuccess: (data) => {
      console.log('Payment success:', data);
    },
    onFailed: (status) => {
      console.log('Payment failed:', status);
    }
  });

  btn.onclick = () => {
    qris.openPayment();
  };
</script>

```

---

## 📌 USE CASES

Di semua skenario di bawah, **`invoice` wajib** dikirim ke `new QrisSDK({ ... })` (biasanya nilai yang sama dengan nomor invoice/order di database Anda). Backend pada `onSuccess` harus memverifikasi invoice tersebut (bukan hanya mempercayai isi body dari browser).

### 1. WordPress

WordPress tidak menyediakan “plugin resmi” untuk SDK ini; integrasi dilakukan dengan **muat script UMD**, **elemen HTML** di template/shortcode, dan **titik backend** (AJAX atau REST API) bila Anda perlu memperbarui data di database (misalnya status pesanan) setelah `onSuccess`. Pola di bawah berlaku universal untuk **tema custom**, **child theme**, atau **plugin buatan sendiri**—bukan terikat satu plugin toko tertentu.

#### Prasyarat

* Domain situs production sudah **didaftarkan** ke admin PopPay (sama seperti penggunaan di stack lain).
* Pastikan halaman pembayaran memuat variabel global `ajaxurl` bila memakai `admin-ajax.php` (banyak tema menambahkan ini di `wp_head`; jika belum ada, gunakan `admin_url('admin-ajax.php')` di `wp_localize_script` atau atribut `data-*` pada elemen HTML).

#### Pola integrasi universal (ringkas)

1. **Muat SDK dari CDN** hanya di halaman yang relevan (checkout, thank-you, atau halaman custom), agar performa tetap ringan:
   * Di **child theme** `functions.php`: hook `wp_enqueue_scripts`, cek kondisi halaman (`is_page()`, `is_checkout()` WooCommerce, dll.), lalu `wp_enqueue_script` dengan URL `https://unpkg.com/@poppackage/qris-payment-sdk/dist/qris-sdk.umd.js` (atau salin URL yang sama ke tag `<script>` di template jika tidak memakai enqueue).
2. **Output HTML** di template halaman tersebut (atau lewat shortcode):
   * Satu elemen untuk `resultContainerId` (misalnya `<div id="payment-result"></div>`).
   * Satu tombol yang memicu `qris.openPayment()`.
3. **Data dinamis dari PHP** (disarankan):
   * Nominal (`amount`), **`invoice`** (wajib), catatan (`notes`), nama/email pembeli (`payor_name`, `payor_email`) diisi dari meta post, post meta order, atau objek order plugin yang Anda pakai—bukan hardcode.
   * Untuk keamanan pembaruan status di server: hasilkan **nonce** WordPress (`wp_create_nonce`) dan kirim bersama permintaan AJAX dari `onSuccess`.
4. **Backend wajib jika status harus tersimpan di database**:
   * Daftarkan handler dengan `add_action('wp_ajax_...', ...)` dan `add_action('wp_ajax_nopriv_...', ...)` untuk pengguna tidak login jika perlu.
   * Di handler: verifikasi nonce, validasi order/invoice, lalu `UPDATE` data (post meta, tabel custom, atau API plugin toko). **Templat PHP checkout saja tidak ikut dieksekusi** pada request `admin-ajax.php`, jadi logika update **tidak** boleh hanya berada di file template yang di-`include` sekali saat halaman tampil—harus di file yang selalu dimuat lewat `functions.php` / plugin utama / `ajax.php` theme.
5. **JavaScript**: setelah `QrisSDK` tersedia (`typeof QrisSDK !== 'undefined'`), inisialisasi seperti pada bagian *Laravel / Vanilla JS*, lalu di `onSuccess` panggil `fetch(ajaxurl, { method: 'POST', body: URLSearchParams dengan action + nonce + id order })` lalu perbarui UI (sembunyikan tombol, tampilkan pesan sukses, redirect, dll.).

Dengan pola di atas, Anda bisa memasang SDK di **halaman statis**, **WooCommerce**, **Easy Digital Downloads**, **toko theme custom**, atau kombinasi plugin—yang berubah hanya sumber data PHP (dari mana diambil `amount`, **`invoice`**, dan id pesanan) dan bentuk penyimpanan status di server.

#### Contoh referensi nyata: ayoborong.com

[Situs ayoborong.com](https://ayoborong.com) memakai WordPress dengan ekosistem toko berbasis theme **vmplace** dan alur **Velocity** (keranjang → checkout → pembayaran **PGAuto / QRIS**). Contoh implementasi yang selaras dengan panduan universal di atas:

| Lapisan | Peran |
| --- | --- |
| Tampilan & inisialisasi SDK | File template theme, misalnya `payment-pgauto-display.php`: menghitung nominal dan data pembeli dari POST atau dari baris order di database, menampilkan `#poppay-payment-result`, tombol bayar, serta tag `<script>` yang memuat UMD dan membuat instance `QrisSDK` dengan `onSuccess` / `onFailed`. |
| Pembaruan status “dibayar” di server | File PHP terpisah yang **selalu** dimuat dari `functions.php` (atau digabung ke file AJAX theme), mendefinisikan action `admin-ajax` yang memverifikasi nonce + invoice, memastikan metode pembayaran sesuai, lalu mengupdate status order di tabel custom toko. |
| Alur pengguna | Pembeli menyelesaikan checkout → halaman instruksi pembayaran menampilkan QR existing + opsi **Bayar pakai QRIS PopPay** → setelah sukses di SDK, browser memanggil AJAX → UI sukses dan data order konsisten dengan status dibayar di sistem. |

Contoh ini mengikuti prinsip universal: **frontend** (template + CDN + `QrisSDK`) dan **backend** (AJAX + nonce) terpisah dengan jelas. Anda dapat menyalin polanya ke proyek WordPress lain dengan mengganti sumber data order dan query update sesuai plugin/tema masing-masing.

#### Contoh kode: backend (PHP) — `admin-ajax` + update database

Letakkan di **plugin custom**, **`functions.php` child theme**, atau file include theme yang **selalu** dimuat. Ganti nama action, nama tabel/meta, dan logika update sesuai struktur data Anda (WooCommerce, tabel custom, CPT, dll.).

**Pola umum: tabel custom** (`$wpdb->prefix . 'nama_tabel'` — contoh field `invoice` + `status`):

```php
<?php
/**
 * Handler AJAX: tandai order lunas setelah onSuccess SDK (panggil dari fetch di frontend).
 * Action: my_qris_mark_paid  → POST field: action, invoice, nonce
 */
add_action( 'wp_ajax_my_qris_mark_paid', 'my_qris_mark_paid_handler' );
add_action( 'wp_ajax_nopriv_my_qris_mark_paid', 'my_qris_mark_paid_handler' );

function my_qris_mark_paid_handler() {
	$invoice = isset( $_POST['invoice'] ) ? sanitize_text_field( wp_unslash( $_POST['invoice'] ) ) : '';
	$nonce   = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';

	if ( ! $invoice || ! wp_verify_nonce( $nonce, 'my_qris_' . $invoice ) ) {
		wp_send_json_error( array( 'message' => 'Permintaan tidak valid.' ), 403 );
	}

	global $wpdb;
	$table = $wpdb->prefix . 'orders'; // SESUAIKAN nama tabel order Anda.

	$row = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE invoice = %s", $invoice ) );
	if ( ! $row ) {
		wp_send_json_error( array( 'message' => 'Order tidak ditemukan.' ), 404 );
	}

	// Opsional: pastikan pembeli yang login = pemilik order.
	if ( is_user_logged_in() && isset( $row->user_id ) && (int) $row->user_id !== get_current_user_id() ) {
		wp_send_json_error( array( 'message' => 'Akses ditolak.' ), 403 );
	}

	$updated = $wpdb->update(
		$table,
		array( 'status' => 'paid' ), // SESUAIKAN nilai / kolom status.
		array( 'invoice' => $invoice ),
		array( '%s' ),
		array( '%s' )
	);

	if ( false === $updated ) {
		wp_send_json_error( array( 'message' => 'Gagal memperbarui database.' ), 500 );
	}

	wp_send_json_success( array( 'message' => 'Status diperbarui.' ) );
}
```

**Pola alternatif: WooCommerce** (jika `order_id` diketahui dan plugin aktif):

```php
<?php
function my_qris_wc_mark_paid_handler() {
	$order_id = isset( $_POST['order_id'] ) ? absint( $_POST['order_id'] ) : 0;
	$nonce    = isset( $_POST['nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['nonce'] ) ) : '';

	if ( ! $order_id || ! wp_verify_nonce( $nonce, 'my_qris_wc_' . $order_id ) ) {
		wp_send_json_error( array( 'message' => 'Permintaan tidak valid.' ), 403 );
	}
	if ( ! function_exists( 'wc_get_order' ) ) {
		wp_send_json_error( array( 'message' => 'WooCommerce tidak aktif.' ), 400 );
	}

	$order = wc_get_order( $order_id );
	if ( ! $order ) {
		wp_send_json_error( array( 'message' => 'Order tidak ditemukan.' ), 404 );
	}

	// Contoh: tandai sudah dibayar (sesuaikan dengan alur Anda).
	$order->payment_complete();
	// atau: $order->update_status( 'processing' );

	wp_send_json_success( array( 'message' => 'Pembayaran tercatat.' ) );
}
// add_action( 'wp_ajax_my_qris_wc_mark_paid', 'my_qris_wc_mark_paid_handler' );
// add_action( 'wp_ajax_nopriv_my_qris_wc_mark_paid', 'my_qris_wc_mark_paid_handler' );
```

#### Contoh kode: frontend universal WordPress — enqueue SDK + inisialisasi

**Langkah A — muat SDK (dan opsional skrip init) dari `functions.php` atau plugin:**

```php
add_action( 'wp_enqueue_scripts', function () {
	// SESUAIKAN kondisi halaman (slug, ID, is_checkout(), dll.).
	if ( ! is_page( 'thank-you' ) ) {
		return;
	}

	wp_enqueue_script(
		'qris-poppay-sdk',
		'https://unpkg.com/@poppackage/qris-payment-sdk/dist/qris-sdk.umd.js',
		array(),
		null,
		true
	);
} );
```

**Langkah B — di template halaman pembayaran (misalnya `page-thank-you.php` atau template checkout theme), output data dari PHP + tombol + skrip:**

Nilai `$amount`, `$invoice`, `$payor_name`, `$payor_email` harus berasal dari order sungguhan (query DB / fungsi plugin), bukan angka statis.

```php
<?php
// Contoh data dari order (sesuaikan dengan proyek Anda):
$amount      = 50000;
$invoice     = 'INV-1001';
$payor_name  = 'Budi';
$payor_email = 'budi@example.com';
$nonce       = wp_create_nonce( 'my_qris_' . $invoice );
$ajax_url    = esc_url( admin_url( 'admin-ajax.php' ) );
?>
<div id="qris-payment-result"></div>
<button type="button" id="qris-pay-button" class="button">Bayar QRIS PopPay</button>

<script>
document.addEventListener('DOMContentLoaded', function () {
	if (typeof QrisSDK === 'undefined') {
		console.error('QrisSDK belum dimuat. Pastikan script CDN di-enqueue.');
		return;
	}
	var btn = document.getElementById('qris-pay-button');
	var invoice = <?php echo wp_json_encode( $invoice ); ?>;
	var nonce = <?php echo wp_json_encode( $nonce ); ?>;

	var qris = new QrisSDK({
		amount: <?php echo (int) $amount; ?>,
		invoice: invoice,
		notes: 'Invoice ' + invoice,
		payor_name: <?php echo wp_json_encode( $payor_name ); ?>,
		payor_email: <?php echo wp_json_encode( $payor_email ); ?>,
		resultContainerId: 'qris-payment-result',
		onSuccess: function (data) {
			var body = new URLSearchParams();
			body.append('action', 'my_qris_mark_paid');
			body.append('invoice', invoice);
			body.append('nonce', nonce);

			var ajaxUrl = (typeof ajaxurl !== 'undefined') ? ajaxurl : <?php echo wp_json_encode( $ajax_url ); ?>;

			fetch(ajaxUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
				body: body.toString(),
				credentials: 'same-origin'
			})
			.then(function (r) { return r.json(); })
			.then(function (json) {
				if (json && json.success) {
					alert('Pembayaran berhasil & status order diperbarui.');
				} else {
					alert((json && json.data && json.data.message) ? json.data.message : 'Gagal memperbarui server.');
				}
			})
			.catch(function (err) { console.error(err); });
		},
		onFailed: function (status) {
			console.log('QRIS gagal / timeout:', status);
		}
	});

	btn.addEventListener('click', function () {
		qris.openPayment();
	});
});
</script>
```

**Catatan:** Jika tema Anda **belum** mendefinisikan `ajaxurl` di frontend, gunakan variabel `ajaxUrl` seperti di atas (sudah memakai `admin_url( 'admin-ajax.php' )` dari PHP). Nama action AJAX (`my_qris_mark_paid`) harus **sama** dengan `add_action` di backend.

---

### 2. Laravel

Di Laravel, pola universalnya: **halaman Blade atau Inertia** memuat SDK (CDN atau bundler), `onSuccess` memanggil **route POST** (biasanya di `routes/web.php` dengan **CSRF** + **middleware** `auth` bila pembeli login). Controller memverifikasi bahwa order milik user (atau token sekali pakai untuk guest—sesuaikan), lalu **Eloquent** / **Query Builder** meng-`update` baris order.

#### Prasyarat

* Domain production terdaftar di admin PopPay.
* Pastikan **CSRF token** tersedia di frontend (meta tag `csrf-token` di layout, atau `@csrf` pada form) untuk request `POST` dari JavaScript.
* Untuk API stateless (mobile / SPA terpisah), pertimbangkan **Laravel Sanctum** atau **signed URL** alih-alir contoh `web` + session di bawah.

#### Pola integrasi universal (ringkas)

1. **Muat SDK** di layout halaman pembayaran (`@push('scripts')` atau Vite).
2. Saat inisialisasi **`QrisSDK`**, sertakan **`invoice` wajib** (sama dengan kolom invoice order di database).
3. **Controller** menerima `invoice` (dan opsional `order_id`), memvalidasi, mengupdate kolom `status` / `payment_status` pada model `Order`.
4. **Frontend** di `onSuccess`: `fetch` ke route Laravel dengan header `X-CSRF-TOKEN` dan `Accept: application/json`, body JSON `{ invoice }`.

#### Contoh kode: backend (Laravel) — route + controller + update database

**`routes/web.php`** (contoh; sesuaikan prefix & middleware):

```php
<?php

use App\Http\Controllers\OrderController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::post('/orders/qris-mark-paid', [OrderController::class, 'markPaidFromQris'])
        ->name('orders.qris-mark-paid');
});
```

**`app/Http/Controllers/OrderController.php`**:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    /**
     * Dipanggil dari onSuccess SDK — update status order di database.
     */
    public function markPaidFromQris(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice' => ['required', 'string', 'max:100'],
        ]);

        $order = Order::query()
            ->where('invoice', $validated['invoice'])
            ->where('user_id', auth()->id()) // pastikan pemilik order = user login
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Order tidak ditemukan.'], 404);
        }

        // Opsional: cegah double-update jika sudah paid
        if ($order->status === 'paid') {
            return response()->json(['message' => 'Sudah dibayar.', 'already' => true]);
        }

        $order->update([
            'status' => 'paid', // SESUAIKAN nama kolom / nilai enum Anda
        ]);

        return response()->json(['message' => 'Status diperbarui.']);
    }
}
```

**`app/Models/Order.php`**: pastikan `invoice`, `user_id`, `status` ada di `$fillable` (atau gunakan `$guarded = []` hanya untuk development).

#### Contoh kode: frontend (Blade + UMD dari CDN)

Letakkan di view Blade tempat data order sudah tersedia (`$order`). Untuk **guest checkout**, ganti middleware/route dengan pola **signed URL** atau **token sekali pakai** yang Anda generate di server—jangan mempercayai `invoice` saja tanpa verifikasi tambahan.

```blade
{{-- resources/views/orders/pay.blade.php --}}
<meta name="csrf-token" content="{{ csrf_token() }}">

<div id="qris-payment-result"></div>
<button type="button" id="qris-pay-button">Bayar QRIS PopPay</button>

<script src="https://unpkg.com/@poppackage/qris-payment-sdk/dist/qris-sdk.umd.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
    if (typeof QrisSDK === 'undefined') return;

    var invoice = @json($order->invoice);
    var csrf = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    var url = @json(route('orders.qris-mark-paid'));

    var qris = new QrisSDK({
        amount: {{ (int) $order->total_amount }},
        invoice: invoice,
        notes: 'Invoice ' + invoice,
        payor_name: @json($order->customer_name ?? ''),
        payor_email: @json($order->customer_email ?? ''),
        resultContainerId: 'qris-payment-result',
        onSuccess: function () {
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrf,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({ invoice: invoice }),
                credentials: 'same-origin'
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.message) { alert(data.message); }
            })
            .catch(console.error);
        },
        onFailed: function (status) {
            console.log('QRIS gagal / timeout:', status);
        }
    });

    document.getElementById('qris-pay-button').addEventListener('click', function () {
        qris.openPayment();
    });
});
</script>
```

---

### 3. Next.js (App Router)

Di Next.js, **jangan** mengupdate database langsung dari komponen klien. Pola universal: **Server Action** atau **Route Handler** (`app/api/.../route.ts`) yang memverifikasi sesi (misalnya **NextAuth**, **Clerk**, atau cookie session Anda), lalu memanggil **ORM / SQL** (Prisma, Drizzle, Kysely, dll.). Komponen klien memuat **ESM** `@poppackage/qris-payment-sdk`, lalu di `onSuccess` memanggil `fetch('/api/...')` dengan **credentials** bila memakai cookie session.

#### Prasyarat

* Domain production terdaftar di admin PopPay.
* Pastikan route API **tidak** mengekspos secret server ke browser; gunakan **session** atau **JWT server-side** untuk membuktikan identitas pembeli.

#### Pola integrasi universal (ringkas)

1. Pasang paket: `npm i @poppackage/qris-payment-sdk`.
2. Buat **Route Handler** `POST` yang membaca body `{ invoice }`, memverifikasi sesi, mengupdate tabel order.
3. Di **Client Component** (`'use client'`), inisialisasi `QrisSDK` dengan **`invoice` wajib** (string dari server, misalnya dari props halaman) dan pada `onSuccess` panggil API dengan `fetch`.

#### Contoh kode: backend (Next.js Route Handler) — update database

Sesuaikan impor DB dengan stack Anda (contoh di bawah memakai pola Prisma; ganti dengan query Anda).

**`app/api/orders/qris-mark-paid/route.ts`**:

```typescript
import { NextResponse } from 'next/server';
// import { getServerSession } from 'next-auth'; // jika pakai NextAuth
// import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invoice = typeof body.invoice === 'string' ? body.invoice.trim() : '';

    if (!invoice) {
      return NextResponse.json({ message: 'invoice wajib diisi.' }, { status: 400 });
    }

    // --- Verifikasi sesi (contoh; sesuaikan dengan auth Anda) ---
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.id) {
    //   return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    // }

    // --- Contoh Prisma (uncomment & sesuaikan model) ---
    // const order = await prisma.order.findFirst({
    //   where: {
    //     invoice,
    //     userId: session.user.id as string,
    //   },
    // });
    // if (!order) {
    //   return NextResponse.json({ message: 'Order tidak ditemukan.' }, { status: 404 });
    // }
    // await prisma.order.update({
    //   where: { id: order.id },
    //   data: { status: 'paid' },
    // });

    return NextResponse.json({ message: 'Status diperbarui.' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
```

Uncomment dan sambungkan blok Prisma (atau `db.execute` mentah) sesuai skema Anda. Intinya: **satu sumber kebenaran di server** yang menulis ke database.

#### Contoh kode: frontend (Client Component + ESM)

**`components/QrisPayButton.tsx`**:

```tsx
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { QrisSDK } from '@poppackage/qris-payment-sdk';

type Props = {
  amount: number;
  invoice: string;
  payorName: string;
  payorEmail: string;
};

export function QrisPayButton({ amount, invoice, payorName, payorEmail }: Props) {
  const qrisRef = useRef<QrisSDK | null>(null);

  useEffect(() => {
    qrisRef.current = new QrisSDK({
      amount,
      invoice,
      notes: `Invoice ${invoice}`,
      payor_name: payorName,
      payor_email: payorEmail,
      resultContainerId: 'qris-payment-result',
      onSuccess: async () => {
        const res = await fetch('/api/orders/qris-mark-paid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invoice }),
          credentials: 'include', // penting jika auth berbasis cookie
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.message ?? 'Gagal memperbarui order.');
          return;
        }
        alert(data.message ?? 'Pembayaran tercatat.');
      },
      onFailed: (status) => {
        console.log('QRIS gagal / timeout:', status);
      },
    });
  }, [amount, invoice, payorName, payorEmail]);

  const open = useCallback(() => {
    qrisRef.current?.openPayment();
  }, []);

  return (
    <>
      <div id="qris-payment-result" />
      <button type="button" onClick={open}>
        Bayar QRIS PopPay
      </button>
    </>
  );
}
```

Halaman server (`page.tsx`) mengambil order dari database dan meneruskan `amount`, `invoice`, dll. ke `<QrisPayButton />` sebagai props.

---

## 📖 Konfigurasi (Options)

Anda dapat mengirimkan objek konfigurasi saat inisialisasi `new QrisSDK(config)`.

| Parameter | Wajib / Opsional | Tipe | Fungsi | Contoh isi |
| --- | --- | --- | --- | --- |
| **`amount`** | Wajib | `number` | Nominal pembayaran dalam Rupiah (IDR). Dikirim ke gateway saat membuat transaksi. | `50000` |
| **`invoice`** | Wajib | `string` | Pengenal unik transaksi/order di sistem Anda (nomor invoice, order id publik, dll.). Harus konsisten dengan data di database agar backend dapat memvalidasi pembayaran di `onSuccess`. | `'INV-2026-0042'` |
| **`notes`** | Opsional | `string` | Catatan transaksi (mutasi/laporan). Jika tidak diisi, SDK memakai string kosong. | `'Pesanan #1001'` |
| **`payor_email`** | Opsional | `string` | Email pembayar, jika ingin dicatat bersama transaksi. | `'buyer@example.com'` |
| **`payor_name`** | Opsional | `string` | Nama pembayar, jika ingin dicatat bersama transaksi. | `'Budi Santoso'` |
| **`expirationInterval`** | Opsional | `number` | Masa berlaku QR dalam **detik**. Default SDK: `300` (5 menit). | `300` |
| **`onSuccess`** | Opsional | `(data: any) => void` | Dipanggil saat pembayaran berhasil. Jika tidak diisi, SDK hanya `console.log`. | `(data) => { /* redirect / toast */ }` |
| **`onFailed`** | Opsional | `(status: any) => void` | Dipanggil saat gagal atau timeout. Jika tidak diisi, SDK hanya `console.log`. | `(status) => { /* tampilkan error */ }` |
| **`resultContainerId`** | Opsional | `string` | ID elemen HTML tempat hasil pembayaran akan di-inject secara otomatis. | `'payment-result'` |

### NB: Wajib mendaftarkan domain ke admin terlebih dahulu