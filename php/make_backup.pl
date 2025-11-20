#!/usr/bin/perl

use POSIX qw(strftime);


my $HOST="localhost";
my $PORT=3306;
my $USER="abr";
my $PASS="abr2005";
my $DB="abr";
my $fname = "/tmp/backup_abr" . strftime("%Y-%m-%d_%H:%M:%S", localtime) . ".sql";
my $MEGA_USER = "abra4550455\@gmail.com";
my $MEGA_PASS = "abr2005";

print "Generando archivo de backup de base de datos...\n";
system("mysqldump -B -h".$HOST." -P".$PORT." -p".$PASS." -u".$USER."  --skip-set-charset --order-by-primary --delayed-insert abr -r".$fname);
print "Comprimiendo la base de datos...\n";
system("bzip2 --best ".$fname);
#########################################################################
#  Para depurar:
#system("rm ".$fname.".bz2");
#system("echo '1234' > ".$fname.".bz2");
#########################################################################
print "Subiendo la base de datos a la nube...\n";
system("megaput --username=".$MEGA_USER." --password=".$MEGA_PASS." --path=/Root/backup ".$fname.".bz2");
print "Eliminando el archivo local...\n";
system("rm ".$fname.".bz2");
system("megals --username=" . $MEGA_USER . " --password=" . $MEGA_PASS . " --names /Root/backup/ > output");

open(SYS_OUT, "output") or die "Could not open the output";
my $output = join "", <SYS_OUT>;
close SYS_OUT;

my @filenames = split /\n/, $output;
print "Cantidad de archivos: " . scalar @filenames. "\n";

for ($i=1; $i <= scalar @filenames; $i++) {
  print $i . " -> " . @filenames[$i-1] . "\n";
}

if (scalar @filenames > 10) {
  for ($i=0; $i<scalar @filenames - 10; $i++) {
    print "Eliminando " . @filenames[$i] . "\n";
    my $res = system("megarm --username=" . $MEGA_USER . " --password=" . $MEGA_PASS . " /Root/backup/" . $filenames[$i]);
  }
}
system("rm output");
