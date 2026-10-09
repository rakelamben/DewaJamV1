-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE toko_jam.admins (
  admin_id uuid NOT NULL DEFAULT gen_random_uuid(),
  username character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  nama character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  personnel_id uuid NOT NULL UNIQUE,
  CONSTRAINT admins_pkey PRIMARY KEY (admin_id),
  CONSTRAINT admins_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.customers (
  customer_id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama character varying NOT NULL,
  no_hp character varying NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (customer_id)
);
CREATE TABLE toko_jam.products (
  product_id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_barang character varying NOT NULL,
  kategori character varying NOT NULL CHECK (kategori::text = ANY (ARRAY['Jam Tangan Pria'::character varying, 'Jam Tangan Wanita'::character varying, 'Jam Tangan Anak-anak'::character varying, 'Smartwatch'::character varying, 'Jam Tangan Luxury'::character varying, 'Strap & Aksesoris'::character varying]::text[])),
  harga numeric NOT NULL CHECK (harga >= 0::numeric),
  stok integer NOT NULL DEFAULT 0 CHECK (stok >= 0),
  deskripsi text,
  gambar_url text,
  tags character varying[] NOT NULL DEFAULT '{}'::character varying[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (product_id)
);
CREATE TABLE toko_jam.transactions (
  transaction_id uuid NOT NULL DEFAULT gen_random_uuid(),
  no_invoice character varying NOT NULL UNIQUE,
  customer_id uuid NOT NULL,
  tanggal_transaksi timestamp with time zone NOT NULL DEFAULT now(),
  total_harga numeric NOT NULL DEFAULT 0 CHECK (total_harga >= 0::numeric),
  status character varying NOT NULL DEFAULT 'selesai'::character varying CHECK (status::text = ANY (ARRAY['selesai'::character varying, 'dibatalkan'::character varying]::text[])),
  personnel_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id),
  CONSTRAINT transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES toko_jam.customers(customer_id),
  CONSTRAINT transactions_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.transaction_items (
  item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  product_id uuid,
  nama_barang_snapshot character varying NOT NULL,
  harga_satuan numeric NOT NULL CHECK (harga_satuan >= 0::numeric),
  qty integer NOT NULL CHECK (qty > 0),
  subtotal numeric NOT NULL CHECK (subtotal >= 0::numeric),
  CONSTRAINT transaction_items_pkey PRIMARY KEY (item_id),
  CONSTRAINT transaction_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES toko_jam.transactions(transaction_id),
  CONSTRAINT transaction_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES toko_jam.products(product_id)
);
CREATE TABLE toko_jam.personnel (
  personnel_id uuid NOT NULL DEFAULT gen_random_uuid(),
  personnel_type character varying NOT NULL CHECK (personnel_type::text = ANY (ARRAY['admin'::character varying::text, 'staff'::character varying::text, 'manager'::character varying::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT personnel_pkey PRIMARY KEY (personnel_id)
);
CREATE TABLE toko_jam.managers (
  manager_id uuid NOT NULL DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL UNIQUE,
  username character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  nama character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT managers_pkey PRIMARY KEY (manager_id),
  CONSTRAINT managers_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.staff (
  staff_id uuid NOT NULL DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL UNIQUE,
  manager_id uuid,
  username character varying NOT NULL UNIQUE,
  password_hash text NOT NULL,
  nama character varying NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['staf_gudang'::character varying::text, 'staf_operasional'::character varying::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT staff_pkey PRIMARY KEY (staff_id),
  CONSTRAINT staff_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES toko_jam.personnel(personnel_id),
  CONSTRAINT staff_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES toko_jam.managers(manager_id)
);
CREATE TABLE toko_jam.documents (
  document_id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipe_dokumen character varying NOT NULL,
  judul character varying NOT NULL,
  deskripsi text,
  file_url text,
  status character varying NOT NULL DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying::text, 'final'::character varying::text, 'arsip'::character varying::text])),
  created_by uuid NOT NULL,
  transaction_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (document_id),
  CONSTRAINT documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES toko_jam.personnel(personnel_id),
  CONSTRAINT documents_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES toko_jam.transactions(transaction_id)
);
CREATE TABLE toko_jam.messages (
  message_id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid,
  subject character varying,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (message_id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES toko_jam.personnel(personnel_id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.notifications (
  notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipe character varying NOT NULL CHECK (tipe::text = ANY (ARRAY['stok_rendah'::character varying::text, 'transaksi_baru'::character varying::text, 'dokumen_baru'::character varying::text, 'workflow'::character varying::text, 'surat_masuk'::character varying::text])),
  reference_table character varying,
  reference_id uuid,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  target_personnel_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (notification_id),
  CONSTRAINT notifications_target_personnel_id_fkey FOREIGN KEY (target_personnel_id) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.shifts (
  shift_id uuid NOT NULL DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL,
  tanggal date NOT NULL,
  jam_mulai time without time zone NOT NULL,
  jam_selesai time without time zone NOT NULL,
  status_kehadiran character varying NOT NULL DEFAULT 'terjadwal'::character varying CHECK (status_kehadiran::text = ANY (ARRAY['terjadwal'::character varying::text, 'hadir'::character varying::text, 'izin'::character varying::text, 'alpha'::character varying::text])),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shifts_pkey PRIMARY KEY (shift_id),
  CONSTRAINT shifts_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES toko_jam.personnel(personnel_id),
  CONSTRAINT shifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.activity_logs (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL,
  action character varying NOT NULL CHECK (action::text = ANY (ARRAY['create'::character varying::text, 'update'::character varying::text, 'delete'::character varying::text])),
  table_name character varying NOT NULL,
  record_id uuid,
  detail jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT activity_logs_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.workflow_requests (
  request_id uuid NOT NULL DEFAULT gen_random_uuid(),
  tipe_request character varying NOT NULL,
  reference_table character varying,
  reference_id uuid,
  deskripsi text,
  requested_by uuid NOT NULL,
  current_status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (current_status::text = ANY (ARRAY['pending'::character varying::text, 'approved'::character varying::text, 'rejected'::character varying::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workflow_requests_pkey PRIMARY KEY (request_id),
  CONSTRAINT workflow_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.workflow_approvals (
  approval_id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE,
  approver_id uuid,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'approved'::character varying::text, 'rejected'::character varying::text])),
  catatan text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workflow_approvals_pkey PRIMARY KEY (approval_id),
  CONSTRAINT workflow_approvals_request_id_fkey FOREIGN KEY (request_id) REFERENCES toko_jam.workflow_requests(request_id),
  CONSTRAINT workflow_approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.correspondence (
  correspondence_id uuid NOT NULL DEFAULT gen_random_uuid(),
  nomor_agenda character varying NOT NULL UNIQUE,
  tipe character varying NOT NULL CHECK (tipe::text = ANY (ARRAY['masuk'::character varying::text, 'keluar'::character varying::text])),
  perihal character varying NOT NULL,
  asal_tujuan character varying NOT NULL,
  tanggal_surat date,
  tanggal_terima date,
  file_url text,
  status character varying NOT NULL DEFAULT 'diterima'::character varying CHECK (status::text = ANY (ARRAY['diterima'::character varying::text, 'diproses'::character varying::text, 'selesai'::character varying::text])),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT correspondence_pkey PRIMARY KEY (correspondence_id),
  CONSTRAINT correspondence_created_by_fkey FOREIGN KEY (created_by) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.correspondence_dispositions (
  disposition_id uuid NOT NULL DEFAULT gen_random_uuid(),
  correspondence_id uuid NOT NULL,
  disposisi_ke uuid NOT NULL,
  instruksi text,
  status character varying NOT NULL DEFAULT 'belum'::character varying CHECK (status::text = ANY (ARRAY['belum'::character varying::text, 'sedang_diproses'::character varying::text, 'selesai'::character varying::text])),
  catatan text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT correspondence_dispositions_pkey PRIMARY KEY (disposition_id),
  CONSTRAINT correspondence_dispositions_correspondence_id_fkey FOREIGN KEY (correspondence_id) REFERENCES toko_jam.correspondence(correspondence_id),
  CONSTRAINT correspondence_dispositions_disposisi_ke_fkey FOREIGN KEY (disposisi_ke) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.knowledge_categories (
  category_id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_kategori character varying NOT NULL UNIQUE,
  deskripsi character varying,
  urutan integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_categories_pkey PRIMARY KEY (category_id)
);
CREATE TABLE toko_jam.knowledge_policies (
  policy_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  judul character varying NOT NULL,
  ringkasan text NOT NULL,
  konten text NOT NULL,
  prioritas integer NOT NULL DEFAULT 2 CHECK (prioritas = ANY (ARRAY[1, 2, 3])),
  nomor_versi character varying NOT NULL DEFAULT 'v1.0'::character varying,
  catatan_revisi text,
  tags ARRAY,
  created_by uuid,
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_policies_pkey PRIMARY KEY (policy_id),
  CONSTRAINT knowledge_policies_category_id_fkey FOREIGN KEY (category_id) REFERENCES toko_jam.knowledge_categories(category_id),
  CONSTRAINT knowledge_policies_created_by_fkey FOREIGN KEY (created_by) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.knowledge_faqs (
  faq_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  pertanyaan text NOT NULL,
  jawaban text NOT NULL,
  nomor_versi character varying NOT NULL DEFAULT 'v1.0'::character varying,
  catatan_revisi text,
  tags ARRAY,
  created_by uuid,
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_faqs_pkey PRIMARY KEY (faq_id),
  CONSTRAINT knowledge_faqs_category_id_fkey FOREIGN KEY (category_id) REFERENCES toko_jam.knowledge_categories(category_id),
  CONSTRAINT knowledge_faqs_created_by_fkey FOREIGN KEY (created_by) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.knowledge_videos (
  video_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  judul character varying NOT NULL,
  deskripsi text NOT NULL,
  video_url character varying NOT NULL,
  durasi_menit integer NOT NULL,
  thumbnail_url character varying,
  nomor_versi character varying NOT NULL DEFAULT 'v1.0'::character varying,
  catatan_revisi text,
  tags ARRAY,
  created_by uuid,
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_videos_pkey PRIMARY KEY (video_id),
  CONSTRAINT knowledge_videos_category_id_fkey FOREIGN KEY (category_id) REFERENCES toko_jam.knowledge_categories(category_id),
  CONSTRAINT knowledge_videos_created_by_fkey FOREIGN KEY (created_by) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.knowledge_case_studies (
  case_study_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  judul character varying NOT NULL,
  ringkasan text NOT NULL,
  kronologi text NOT NULL,
  analisis text NOT NULL,
  solusi text NOT NULL,
  pelajaran text NOT NULL,
  nomor_versi character varying NOT NULL DEFAULT 'v1.0'::character varying,
  catatan_revisi text,
  tags ARRAY,
  created_by uuid,
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_case_studies_pkey PRIMARY KEY (case_study_id),
  CONSTRAINT knowledge_case_studies_category_id_fkey FOREIGN KEY (category_id) REFERENCES toko_jam.knowledge_categories(category_id),
  CONSTRAINT knowledge_case_studies_created_by_fkey FOREIGN KEY (created_by) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.knowledge_articles (
  article_id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid,
  judul character varying NOT NULL,
  ringkasan text NOT NULL,
  konten text NOT NULL,
  nomor_versi character varying NOT NULL DEFAULT 'v1.0'::character varying,
  catatan_revisi text,
  tags ARRAY,
  created_by uuid,
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_articles_pkey PRIMARY KEY (article_id),
  CONSTRAINT knowledge_articles_category_id_fkey FOREIGN KEY (category_id) REFERENCES toko_jam.knowledge_categories(category_id),
  CONSTRAINT knowledge_articles_created_by_fkey FOREIGN KEY (created_by) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.knowledge_attachments (
  attachment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_table character varying NOT NULL CHECK (source_table::text = ANY (ARRAY['knowledge_policies'::character varying, 'knowledge_faqs'::character varying, 'knowledge_videos'::character varying, 'knowledge_case_studies'::character varying, 'knowledge_articles'::character varying]::text[])),
  source_id uuid NOT NULL,
  nama_file character varying NOT NULL,
  file_url character varying NOT NULL,
  tipe_file character varying NOT NULL,
  ukuran_bytes integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_attachments_pkey PRIMARY KEY (attachment_id)
);
CREATE TABLE toko_jam.knowledge_bookmarks (
  bookmark_id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_table character varying NOT NULL CHECK (source_table::text = ANY (ARRAY['knowledge_policies'::character varying, 'knowledge_faqs'::character varying, 'knowledge_videos'::character varying, 'knowledge_case_studies'::character varying, 'knowledge_articles'::character varying]::text[])),
  source_id uuid NOT NULL,
  personnel_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_bookmarks_pkey PRIMARY KEY (bookmark_id),
  CONSTRAINT knowledge_bookmarks_personnel_id_fkey FOREIGN KEY (personnel_id) REFERENCES toko_jam.personnel(personnel_id)
);
CREATE TABLE toko_jam.knowledge_versions (
  version_id uuid NOT NULL DEFAULT gen_random_uuid(),
  source_table character varying NOT NULL CHECK (source_table::text = ANY (ARRAY['knowledge_policies'::character varying, 'knowledge_faqs'::character varying, 'knowledge_videos'::character varying, 'knowledge_case_studies'::character varying, 'knowledge_articles'::character varying]::text[])),
  source_id uuid NOT NULL,
  nomor_versi character varying NOT NULL,
  catatan_perubahan text NOT NULL,
  snapshot_data jsonb NOT NULL,
  diubah_oleh uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT knowledge_versions_pkey PRIMARY KEY (version_id),
  CONSTRAINT knowledge_versions_diubah_oleh_fkey FOREIGN KEY (diubah_oleh) REFERENCES toko_jam.personnel(personnel_id)
);